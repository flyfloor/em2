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
        var parseData = config.parseData;

        if (typeof pkey === 'string' && pkey) {
            _config.pkey = pkey.trim();
        }
        if (typeof parseData === 'function') {
            _config.parseData = parseData;
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
var resloveData = function resloveData(url) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    options = options || {};
    var headers = options.headers || {};

    if (!options.hasOwnProperty('method')) {
        options.method = 'GET';
    }
    if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
    }
    if (!headers['X-Requested-With']) {
        headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    if (!options.credentials) {
        options.credentials = 'same-origin';
    }
    options.headers = headers;

    return new Promise(function (resolve, rejected) {
        fetch(url, options).then(function (response) {
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

var parseDataHandler = function parseDataHandler(obj, handler, func) {
    if (func === undefined) {
        return handler;
    }
    return handler.then(function (data) {
        return func.call(obj, data);
    });
};

em2.prototype = {
    pkey: '_id',
    findOne: function findOne(_id, params) {
        var handler = resloveData(this.url + '/' + _id + serialize(params));
        if ([undefined, null].indexOf(_id) === -1 && _id.constructor === Object) {
            handler = resloveData(this.url + '/' + _id[this.pkey] + serialize(params));
        }
        return parseDataHandler(this, handler, this.parseData);
    },
    find: function find(params) {
        var handler = resloveData('' + this.url + serialize(params));
        return parseDataHandler(this, handler, this.parseData);
    },
    update: function update(params) {
        var _id = params[this.pkey];
        delete params[this.pkey];
        var options = em2.trimParams(this.name, params);
        options = Object.assign({ method: 'PUT' }, { body: JSON.stringify(options) });
        var handler = resloveData(this.url + '/' + _id, options);
        return parseDataHandler(this, handler, this.parseData);
    },
    create: function create(params) {
        delete params[this.pkey];
        var options = em2.trimParams(this.name, params);
        options = Object.assign({ method: 'POST' }, { body: JSON.stringify(params) });
        var handler = resloveData('' + this.url, options);
        return parseDataHandler(this, handler, this.parseData);
    },
    save: function save(params) {
        return params && params[this.pkey] ? this.update(params) : this.create(params);
    },
    destroy: function destroy(params) {
        var _id = params[this.pkey];
        delete params[this.pkey];
        var handler = resloveData(this.url + '/' + _id + serialize(params), { method: 'DELETE' });
        return parseDataHandler(this, handler, this.parseData);
    }
};

module.exports = em2;