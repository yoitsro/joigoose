var Assert = require("assert");
var Hoek = require("hoek");
var Joi = require("joi");

var internals = {
  mongoose: null,
  joiGlobalOptions: {}
};

internals.root = (mongoose, options, subdocumentOptions) => {
  Assert(mongoose);
  internals.mongoose = mongoose;
  internals.joiGlobalOptions = options || null;
  internals.subdocumentOptions = subdocumentOptions || null;

  return {
    convert: internals.convert,
    mongooseValidateWrapper: internals.mongooseValidateWrapper
  };
};

internals.convert = joiObject => {
  if (joiObject === undefined) {
    throw new Error("Ensure the value you're trying to convert exists!");
  }

  // If this object isn't an object, we're done here
  Joi.validate(joiObject, Joi.object());

  if (!joiObject.isJoi) {
    joiObject = Joi.object(joiObject);
  }

  var output = {};

  if (joiObject._flags.default !== undefined) {
    output.default = joiObject._flags.default;
  }

  if (joiObject._meta.length > 0) {
    var toClass = {}.toString;
    // console.log(JSON.stringify(joiObject, null, '  '));

    // Iterate through the array
    for (var i = 0; i < joiObject._meta.length; i++) {
      // Only add objects
      if (toClass.call(joiObject._meta[i]) !== "[object Object]") {
        continue;
      }

      for (var key in joiObject._meta[i]) {
        // Check for _objectId
        if (key === "type" && joiObject._meta[i][key] === "ObjectId") {
          output.type = internals.mongoose.Schema.Types.ObjectId;

          var originalJoiObject = Hoek.clone(joiObject);

          // joiObject = Joi.alternatives([
          //     joiObject,
          //     Joi.object().type(internals.mongoose.Schema.Types.ObjectId)
          // ]);

          joiObject._isObjectId = true;
          originalJoiObject._isObjectId = true;
          joiObject._meta = originalJoiObject._meta;
          joiObject._flags = originalJoiObject._flags;

          output.validate = internals.mongooseValidateWrapper.bind(
            this,
            originalJoiObject
          );
        } else {
          output[key] = joiObject._meta[i][key];
        }
      }
    }
  }

  if (joiObject._type === "object") {
    //  Allow for empty object - https://github.com/hapijs/joi/blob/v9.0.0-3/API.md#object
    if (!joiObject._inner.children)
      return { type: internals.mongoose.Schema.Types.Mixed };

    joiObject._inner.children.forEach(function(child) {
      output[child.key] = internals.convert(child.schema);

      if (internals.isObjectId(child.schema)) {
        child.schema._isObjectId = true;
        // child.schema = Joi.alternatives([
        //     Hoek.clone(child.schema),
        //     Joi.object().type(internals.mongoose.Types.ObjectId)
        // ]);
      }
    });

    return output;
  }

  output.validate = {
    validator: internals.mongooseValidateWrapper.bind(this, joiObject)
  };

  // We don't want the required key added onto objects, hence why its here.
  // If it's added onto objects, Mongoose complains because it can't
  // understand the type 'true'. #truestory #lol
  if (joiObject._flags.presence === "required") {
    output.required = true;
  }

  if (output.type) {
    return output;
  }

  output.type = internals.typeDeterminer(joiObject);

  // If this is an array, let's get rid of the validation cos it causes major
  // beef with validation
  if (Array.isArray(output.type)) {
    delete output.validate;
  }

  return output;
};

internals.typeDeterminer = joiObject => {
  if (joiObject._type === "string") {
    // If the type has already been set, that's probably
    // because it was an ObjectId. In this case, don't set the
    // type as a string.
    return String;
  }

  if (joiObject._type === "number") {
    return Number;
  }

  if (joiObject._type === "date") {
    return Date;
  }

  if (joiObject._type === "boolean") {
    return Boolean;
  }

  var types = {};
  var type = [];
  var i = 0;
  var firstKey;

  if (joiObject._type === "array") {
    // Go through each of the children in the array and get their types
    for (i = 0; i < joiObject._inner.items.length; i++) {
      if (types[joiObject._inner.items[i]._type]) {
        types[joiObject._inner.items[i]._type]++;
      } else {
        types[joiObject._inner.items[i]._type] = 1;
      }
    }

    // If there are multiple types, there's not much else we can do as far as Mongoose goes...
    if (Object.keys(types).length > 1) {
      type.push(internals.mongoose.Schema.Types.Mixed);
      return type;
    }

    // If there are multiple of the same type, this means that there are different schemas.
    // This is alright cos we know they're all the same type
    firstKey = Object.keys(types)[0];
    if (types[firstKey] > 1) {
      type.push(internals.typeDeterminer({ _type: firstKey }));
      return type;
    }

    if (joiObject._inner.items.length === 0) {
      return type;
    }

    // Collate all meta objects because these need to be pushed into the schema options
    let schemaOptions = joiObject._meta.reduce((options, currentOption) => {
      return Object.assign({}, options, currentOption);
    }, {});

    // Combine the explicit schema options with the global subdocument options
    if (internals.subdocumentOptions) {
      schemaOptions = Object.assign(
        {},
        internals.subdocumentOptions,
        schemaOptions
      );
    }

    if (
      internals.typeDeterminer(joiObject._inner.items[0]) !== Object &&
      internals.typeDeterminer(joiObject._inner.items[0]) !== Array
    ) {
      type.push(internals.convert(joiObject._inner.items[0]));
    } else {
      type.push(
        new internals.mongoose.Schema(
          internals.convert(joiObject._inner.items[0]),
          schemaOptions
        )
      );
    }

    return type;
  }

  if (joiObject._type === "alternatives") {
    types = {};

    if (joiObject._inner.matches.length === 0) {
      return internals.mongoose.Schema.Types.Mixed;
    }

    // Go through each of the children in the array and get their types
    for (i = 0; i < joiObject._inner.matches.length; i++) {
      types[joiObject._inner.matches[i].schema._type] = types[
        joiObject._inner.matches[i].schema._type
      ]
        ? types[joiObject._inner.matches[i].schema._type] + 1
        : (types[joiObject._inner.matches[i].schema._type] = 1);
    }

    // If there are multiple types, there's not much else we can do as far as Mongoose goes...
    if (Object.keys(types).length > 1) {
      return internals.mongoose.Schema.Types.Mixed;
    }

    // If there are multiple of the same type, this means that there are different schemas, but the same type :D
    firstKey = Object.keys(types)[0];
    if (types[firstKey] > 1) {
      return internals.typeDeterminer({ _type: firstKey });
    }

    // If we're here, it's because there's a single type, and one schema. So actually, an alternative didn't need to be used...
    return internals.typeDeterminer(joiObject._inner.matches[0].schema);

    // // If there are multiple types in the items, set the type to mixed
    // mixedTypeFound = false;

    // if (joiObject._inner.matches.length === 0) {
    //     mixedTypeFound = true;
    // }

    // types = {};
    // joiObject._inner.matches.forEach(function (item) {

    //     types[item.schema._type] = true;
    // });

    // // If we have one type, then all array items are this
    // if (Object.keys(types).length === 1) {
    //     output = internals.convert(joiObject._inner.matches[0].schema);
    // } else {
    //     mixedTypeFound = true;
    // }

    // if (mixedTypeFound) {
    //     return internals.mongoose.Schema.Types.Mixed;
    // }

    // return output;
  }

  if (joiObject._type === "object") {
    return Object;
  }

  if (joiObject._type === "any") {
    return internals.mongoose.Schema.Types.Mixed;
  }

  throw new TypeError(
    'Unsupported Joi type: "' +
      joiObject._type +
      "\"! Raise an issue on GitHub if you'd like it to be added!"
  );
};

internals.isObjectId = joiObject => {
  if (joiObject._meta.length > 0) {
    var toClass = {}.toString;

    for (var i = 0; i < joiObject._meta.length; i++) {
      // Only add objects
      if (toClass.call(joiObject._meta[i]) !== "[object Object]") {
        continue;
      }

      for (var key in joiObject._meta[i]) {
        // Check for _objectId
        if (key === "type" && joiObject._meta[i][key] === "ObjectId") {
          return true;
        } else {
          return false;
        }
      }
    }
  }

  return false;
};

internals.mongooseValidateWrapper = async (originalJoiSchema, value) => {
  var joiSchema = Hoek.clone(originalJoiSchema);

  if (joiSchema._isObjectId) {
    joiSchema = Joi.alternatives([
      joiSchema,
      Joi.object().type(internals.mongoose.Types.ObjectId)
    ]);
  }

  try {
    await Joi.validate(value, joiSchema, internals.joiGlobalOptions);
  } catch (err) {
    return false;
  }

  return true;
};

module.exports = internals.root;
