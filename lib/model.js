'use strict';

require('whatwg-fetch');
require('es6-promise').polyfill();

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
    var _l = url.length - 1;
    if (_l > 0 && url.charAt(_l) === '/') url = url.slice(0, _l);

    return url;
};

// init config, temporarily set primary key
var initConfig = function initConfig(config) {
    var _config = {};
    if (config) {
        var pkey = config.pkey;
        var _parseData = config.parseData;
        var _exception = config.exception;

        if (typeof pkey === 'string' && pkey) {
            _config.pkey = pkey.trim();
        }
        if (typeof _parseData === 'function') {
            _config.parseData = _parseData;
        }

        if (typeof _exception === 'function') {
            _config.exception = _exception;
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
            if (index === 0) {
                return '' + prev + current + '=' + params[current];
            }
            return prev + '&' + current + '=' + params[current];
        }, '?');
    }
    return '';
};

// fetching api
var resolveData = function resolveData(url) {
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

    return new Promise(function (resolve, rejected) {
        fetch(url, params).then(function (response) {
            response.status >= 200 && response.status < 300 ? resolve(response.json()) : rejected(response);
        }).catch(rejected);
    });
};

// main
var em2 = function em2(model) {
    var config = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    if (model === undefined || model === null || model.constructor !== Object) {
        console.error('model is invalid, did you forget to pass model object');
        return {};
    }

    if (!model.hasOwnProperty('name')) {
        console.warn('model needs a name, could not register to model manager');
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

    // register Model and ModelNames
    if (model.hasOwnProperty('name')) {
        em2.models[model.name] = model;
        em2.modelNames.push(model.name);
    }
    return model;
};

// init em2 model, modelNames
em2.models = {};
em2.modelNames = [];

// trim params by model's fields
em2.trimParams = function (modelName, params) {
    var model = em2.models[modelName];
    if (!model) {
        console.warn('Model is not defined');
        return params;
    }

    var fields = model.fields;

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
                var hasDefault = [undefined, null].indexOf(value) === -1;
                params[name] = hasDefault ? format.default : format.type.call(null);
            }
        } else {
            if (format.type) params[name] = format.type.call(null);
        }
    });
    return params;
};

// remove register
em2.drop = function (name) {
    delete em2.models[name];
    var modelNames = em2.modelNames;

    return modelNames.splice(modelNames.indexOf(name), 1);
};

var injection = function injection(handler) {
    var _this = this;

    var that = this || {};
    var parseData = that.parseData;
    var exception = that.exception;

    if (typeof parseData === 'function') {
        return handler.then(function (data) {
            return parseData.call(_this, data);
        }).catch(function (error) {
            if (typeof exception === 'function') {
                return exception.call(_this, error);
            }
            return error;
        });
    }
    return handler.catch(function (error) {
        if (typeof exception === 'function') {
            return exception.call(_this, error);
        }
        return error;
    });
};

em2.prototype = {
    pkey: '_id',
    findOne: function findOne(_id, params) {
        var handler = null;
        if ([undefined, null].indexOf(_id) === -1 && _id.constructor === Object) {
            handler = resolveData(this.url + '/' + _id[this.pkey] + serialize(params));
        } else {
            handler = resolveData(this.url + '/' + _id + serialize(params));
        }
        return injection.call(this, handler, { parseData: parseData, exception: exception });
    },
    find: function find(params) {
        return injection.call(this, resolveData('' + this.url + serialize(params)), { parseData: parseData, exception: exception });
    },
    update: function update(params) {
        var _id = params[this.pkey];
        delete params[this.pkey];

        var options = em2.trimParams(this.name, params);
        options = Object.assign({ method: 'PUT' }, { body: serialize(options).slice(1) });

        return injection.call(this, resolveData(this.url + '/' + _id, options));
    },
    create: function create(params) {
        delete params[this.pkey];
        var options = em2.trimParams(this.name, params);
        options = Object.assign({ method: 'POST' }, { body: serialize(options).slice(1) });

        return injection.call(this, resolveData('' + this.url, options));
    },
    save: function save(params) {
        return params && params[this.pkey] ? this.update(params) : this.create(params);
    },
    destroy: function destroy(params) {
        var _id = params[this.pkey];
        delete params[this.pkey];

        return injection.call(this, resolveData(this.url + '/' + _id + serialize(params), { method: 'DELETE' }));
    },
    request: function request(method, url, params) {
        if (arguments.length < 2 || typeof method !== 'string' || typeof url !== 'string') {
            return console.error('参数错误');
        }
        function _optionsRequest() {
            var method = arguments.length <= 0 || arguments[0] === undefined ? 'OPTIONS' : arguments[0];
            var url = arguments[1];
            var params = arguments[2];

            params = Object.assign({ method: method }, { body: serialize(params).slice(1) });
            return injection.call(this, resolveData(url, params));
        }
        method = method.toLowerCase();
        switch (method) {
            case 'get':
                return injection.call(this, resolveData('' + url + serialize(params)));
            case 'post':
                return _optionsRequest.call(this, 'POST', url, params);
            case 'put':
                return _optionsRequest.call(this, 'PUT', url, params);
            case 'delete':
                return injection.call(this, resolveData('' + url + serialize(params), { method: 'DELETE' }));
            default:
                return _optionsRequest.call(this, 'OPTIONS', url, params);
        }
    }
};

module.exports = em2;