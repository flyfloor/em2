'use strict';

require('whatwg-fetch');
var RSVP = require('rsvp');

var METHODS = ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'];

var trimFieldSlot = function trimFieldSlot(item) {
    var newItem = { type: item.type, default: item.default };
    if (item.hasOwnProperty('type') && [undefined, null].indexOf(item.type) === -1) {
        if ([undefined, null].indexOf(item.default) !== -1 || item.default.constructor !== item.type) {
            newItem.default = item.type.call(null);
        }
    }
    return newItem;
};

var pushFieldNames = function pushFieldNames(fieldNames, name) {
    var names = fieldNames.slice(0);
    if (names.indexOf(name) === -1) names.push(name);
    return names;
};

// clear fields
var clearFields = function clearFields(fields) {
    var newFields = {};
    var fieldNames = [];

    if (!fields) return { fields: newFields, fieldNames: fieldNames };

    if (fields.constructor === Array) {
        fields.map(function (field) {
            if (field.constructor === String) {
                newFields[field] = trimFieldSlot(field);
                fieldNames = pushFieldNames(fieldNames, field);
            } else if (field.constructor === Object && field.hasOwnProperty('name')) {
                var name = field.name;
                newFields[name] = trimFieldSlot(field);
                fieldNames = pushFieldNames(fieldNames, name);
            }
        });
    } else if (fields.constructor === Object) {
        Object.keys(fields).map(function (name) {
            if (fields.hasOwnProperty(name)) {
                newFields[name] = trimFieldSlot(fields[name]);
                fieldNames = pushFieldNames(fieldNames, name);
            }
        });
    }

    return { fields: newFields, fieldNames: fieldNames };
};

// filter url
var filterUrl = function filterUrl(url) {
    if (typeof url !== 'string') url = '';

    // start with '/', but not http or https
    if (url.charAt(0) !== '/') {
        if (url.indexOf('http') !== 0 && url.indexOf('https') !== 0) {
            url = '/' + url;
        }
    }

    // if last is '/', remove it!
    var l = url.length - 1;
    if (l > 0 && url.charAt(l) === '/') url = url.slice(0, l);

    return url;
};

// init config, temporarily set primary key
var initConfig = function initConfig(config) {
    var _config = {};
    if (config) {
        var pkey = config.pkey;
        var parseData = config.parseData;
        var exception = config.exception;

        if (typeof pkey === 'string' && pkey) {
            _config.pkey = pkey.trim();
        }
        if (typeof parseData === 'function') {
            _config.parseData = parseData;
        }

        if (typeof exception === 'function') {
            _config.exception = exception;
        }
    }
    return _config;
};

// serialize params object to ?a=1&b=2
var serialize = function serialize(params) {
    if (params && params.constructor === Object) {
        if (Object.getOwnPropertyNames(params).length === 0) {
            return '';
        }
        return Object.keys(params).reduce(function (prev, current, index) {
            if ([undefined, null].indexOf(params[current]) !== -1) {
                return prev;
            }
            if (prev.slice(-1) === '?') {
                return '' + prev + current + '=' + params[current];
            }
            return prev + '&' + current + '=' + params[current];
        }, '?');
    }
    return '';
};

// main
var em2 = function em2(model) {
    var config = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    if (model === undefined || model === null || model.constructor !== Object) {
        console.error('model is invalid, model should be an object');
        return {};
    }

    if (!model.hasOwnProperty('name')) {
        console.error('model needs a name, could not register to model manager');
        return;
    }

    // init config, Model methods
    model = Object.assign({ fieldNames: null }, model, em2.prototype, initConfig(config));

    // format url, fields
    model.url = filterUrl(model.url);

    var _clearFields = clearFields(model.fields);

    var fields = _clearFields.fields;
    var fieldNames = _clearFields.fieldNames;

    model.fields = fields;
    model.fieldNames = fieldNames;

    return model;
};

// reslove Data api
var fetchData = function fetchData(url) {
    var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    params = params || {};
    var headers = params.headers || {};

    if (!params.hasOwnProperty('method')) {
        params.method = 'GET';
    }

    if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
    }
    if (!headers['X-Requested-With']) {
        headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    if (!params.credentials) {
        params.credentials = 'same-origin';
    }
    params.headers = headers;

    return new RSVP.Promise(function (resolve, reject) {
        return fetch(url, params).then(function (response) {
            response.status >= 200 && response.status < 300 ? resolve(response.json()) : reject(response);
        }).catch(reject);
    });
};

// res injection
var resInject = function resInject(pms) {
    var _this = this;

    var that = this || {};
    var parseData = that.parseData;
    var exception = that.exception;


    var errFunc = function errFunc(error) {
        if (typeof exception === 'function') {
            throw exception.call(_this, error);
        }
        throw error;
    };

    if (typeof parseData === 'function') {
        return pms.then(function (data) {
            return parseData.call(_this, data);
        }).catch(errFunc);
    }

    return pms.catch(errFunc);
};

// nested url and params seperate
var shuntNestedParams = function shuntNestedParams(obj) {
    if ([undefined, null].indexOf(obj) !== -1) {
        throw '参数错误';
    }

    var s_url = Object.keys(obj).reduce(function (prev, name) {
        if (obj.hasOwnProperty(name)) {
            var reg = new RegExp('/:' + name, 'gi');
            if (prev.match(reg)) {
                var val = obj[name];
                delete obj[name];
                return prev.replace(reg, '/' + val);
            }
        }
        return prev;
    }, this.url);

    return {
        s_url: s_url,
        s_params: obj
    };
};

var reqDispatch = function reqDispatch() {
    var method = arguments.length <= 0 || arguments[0] === undefined ? 'OPTIONS' : arguments[0];
    var url = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];
    var params = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    method = method.toUpperCase();
    if (METHODS.indexOf(method) === -1) method = 'OPTIONS';
    if (['HEAD', 'GET'].indexOf(method) !== -1) {
        return resInject.call(this, fetchData('' + url + serialize(params)));
    }
    if (method === 'DELETE') {
        return resInject.call(this, fetchData('' + url + serialize(params), { method: 'DELETE' }));
    }

    params = Object.assign({ method: method }, { body: serialize(params).slice(1) });
    return resInject.call(this, fetchData(url, params));
};

// prototype
em2.prototype = {
    pkey: '_id',
    nested: function nested() {
        return this.url.indexOf(':') !== -1;
    },
    trimParams: function trimParams(params) {
        var fields = this.fields;

        Object.keys(fields).forEach(function (name) {
            var format = fields[name];
            if (params.hasOwnProperty(name)) {
                var value = params[name];
                var hasType = [undefined, null].indexOf(format.type) === -1;
                var hasVal = [undefined, null].indexOf(value) === -1;

                // field has no type, and params's field has no value, remove key
                if (!hasType && !hasVal) delete params[name];

                // field has type, and params's field has no value or value type wrong, filled with default
                if (hasType && (!hasVal || value.constructor !== format.type)) {
                    params[name] = [undefined, null].indexOf(value) === -1 ? format.default : format.type.call(null);
                }
            } else {
                if (format.type) params[name] = format.type.call(null);
            }
        });
        return params;
    },
    findOne: function findOne(_id) {
        var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        // nested model
        if (this.nested()) {
            if ([undefined, null].indexOf(_id) === -1 && _id.constructor === Object) {
                var _shuntNestedParams$ca = shuntNestedParams.call(this, _id);

                var s_url = _shuntNestedParams$ca.s_url;

                var pkey = _id[this.pkey];
                delete _id[this.pkey];
                return reqDispatch.call(this, 'GET', s_url + '/' + pkey, params);
            }
            throw 'wrong params, first argument should be an object, and has property in model\'s url(just like :id) and ' + this.pkey;
        }

        // basic
        if ([undefined, null].indexOf(_id) === -1 && _id.constructor === Object) {
            var _pkey = _id[this.pkey];
            delete _id[this.pkey];
            return reqDispatch.call(this, 'GET', this.url + '/' + _pkey, _id);
        }

        return reqDispatch.call(this, 'GET', this.url + '/' + _id, params);
    },
    find: function find(params) {
        // nested
        if (this.nested()) {
            var _shuntNestedParams$ca2 = shuntNestedParams.call(this, params);

            var s_url = _shuntNestedParams$ca2.s_url;
            var s_params = _shuntNestedParams$ca2.s_params;

            delete s_params[this.pkey];
            return reqDispatch.call(this, 'GET', s_url, s_params);
        }
        // basic
        return reqDispatch.call(this, 'GET', this.url, params);
    },
    update: function update(params) {
        var _id = params[this.pkey];
        delete params[this.pkey];

        if (this.nested()) {
            var _shuntNestedParams$ca3 = shuntNestedParams.call(this, params);

            var s_url = _shuntNestedParams$ca3.s_url;
            var s_params = _shuntNestedParams$ca3.s_params;

            return reqDispatch.call(this, 'PUT', s_url + '/' + _id, this.trimParams.call(this, s_params));
        }
        return reqDispatch.call(this, 'PUT', this.url + '/' + _id, this.trimParams.call(this, params));
    },
    create: function create(params) {
        delete params[this.pkey];
        if (this.nested()) {
            var _shuntNestedParams$ca4 = shuntNestedParams.call(this, params);

            var s_url = _shuntNestedParams$ca4.s_url;
            var s_params = _shuntNestedParams$ca4.s_params;

            return reqDispatch.call(this, 'POST', s_url, this.trimParams.call(this, s_params));
        }
        return reqDispatch.call(this, 'POST', this.url, this.trimParams.call(this, params));
    },
    save: function save(params) {
        return params && params[this.pkey] ? this.update(params) : this.create(params);
    },
    destroy: function destroy(params) {
        var _id = params[this.pkey];
        delete params[this.pkey];

        if (this.nested()) {
            var _shuntNestedParams$ca5 = shuntNestedParams.call(this, params);

            var s_url = _shuntNestedParams$ca5.s_url;
            var s_params = _shuntNestedParams$ca5.s_params;

            return reqDispatch.call(this, 'DELETE', s_url + '/' + _id, s_params);
        }
        return reqDispatch.call(this, 'DELETE', this.url + '/' + _id, params);
    },
    request: function request(method, url, params) {
        if (arguments.length < 2 || typeof method !== 'string' || typeof url !== 'string') {
            return console.error('params wrong, need three arguments: method, url, params(optional query and fetch setting)');
        }

        return reqDispatch.call(this, method, url, params);
    }
};

module.exports = em2;