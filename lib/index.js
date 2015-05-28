var Assert = require('assert');
var Util = require('util');
var Joi = require('joi');
var Mongoose;

var internals = {
    mongoose: null
};

internals.root = function (mongoose) {

    Assert(mongoose);
    internals.mongoose = mongoose;

    return {
        convert: internals.convert,
        mongooseValidateWrapper: internals.mongooseValidateWrapper
    };
};

internals.convert = function (joiObject) {

    if (joiObject === undefined) {
        throw new Error('Ensure the value you\'re trying to convert exists!');
    }
    
    // If this object isn't an object, we're done here
    Joi.validate(joiObject, Joi.object());

    if (!joiObject.isJoi) {
        joiObject = Joi.object(joiObject);
    }

    var output = {};

    if (joiObject._flags.presence === 'required') {
        output.required = true;
    }

    if (joiObject._flags.default !== undefined) {
        output.default = joiObject._flags.default;
    }

    if (joiObject._meta.length > 0) {

        var toClass = {}.toString;
        // console.log(JSON.stringify(joiObject, null, '  '));

        // Iterate through the array
        for (var i = 0; i < joiObject._meta.length; i++) {
            // Only add objects
            if (toClass.call(joiObject._meta[i]) !== '[object Object]') {
                continue;
            }

            for (var key in joiObject._meta[i]) {
                output[key] = joiObject._meta[i][key];
            }
        }
    }

    if (joiObject._type === 'object') {
        joiObject._inner.children.forEach(function (child) {
            output[child.key] = internals.convert(child.schema);
        });

        return output;
    }

    output.validate = internals.mongooseValidateWrapper.bind(this, joiObject);

    if (joiObject._type === 'string') {
        // If the type has already been set, that's probably
        // because it was an ObjectId. In this case, don't set the 
        // type as a string.
        output.type = output.type ? output.type : String;
        return output;
    }

    if (joiObject._type === 'number') {
        output.type = Number;
        return output;
    }

    if (joiObject._type === 'date') {
        output.type = Date;
        return output;
    }

    if (joiObject._type === 'boolean') {
        output.type = Boolean;
        return output;
    }

    if (joiObject._type === 'array') {
        // If there are multiple types in the items, set the type to mixed
        var mixedTypeFound = false;
        if (joiObject._inner.items.length > 0) {
            var types = {};
            joiObject._inner.items.forEach(function (item) {

                types[item._type] = true;
            });

            // If we have one type, then all array items are this
            if (Object.keys(types).length === 1) {
                output = [ internals.convert(joiObject._inner.items[0]) ];
            } else {
                mixedTypeFound = true;
            }
        } else {
            mixedTypeFound = true;
        }

        if (mixedTypeFound) {
            output = [ { type: internals.mongoose.Schema.Types.Mixed } ];
        }
        
        return output;
    }
    
    throw new TypeError('Unsupported Joi type: ' + joiObject._type + '! Raise an issue on GitHub if you\'d like it to be added!');
};

internals.mongooseValidateWrapper = function (joiSchema, value, done) {
    
    return Joi.validate(value, joiSchema, function (err, result) {

        if (err) {
            return done(false);
        }

        return done(true);
    });
};

module.exports = internals.root;