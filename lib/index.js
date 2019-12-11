var Assert = require("assert");
var Hoek = require("@hapi/hoek");
var Joi = require("@hapi/joi");

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

  if (!Joi.isSchema(joiObject)) {
    joiObject = Joi.object(joiObject);
  }
  var output = {};

  if (joiObject._flags.default !== undefined) {
    output.default = joiObject._flags.default;
  }

  if (joiObject.$_terms.metas.length > 0) {
    var toClass = {}.toString;
    // console.log(JSON.stringify(joiObject, null, '  '));

    // Iterate through the array
    for (var i = 0; i < joiObject.$_terms.metas.length; i++) {
      // Only add objects
      if (toClass.call(joiObject.$_terms.metas[i]) !== "[object Object]") {
        continue;
      }

      for (var key in joiObject.$_terms.metas[i]) {
        // Check for _objectId
        if (key === "type" && joiObject.$_terms.metas[i][key] === "ObjectId") {
          output.type = internals.mongoose.Schema.Types.ObjectId;

          var originalJoiObject = Hoek.clone(joiObject);

          // joiObject = Joi.alternatives([
          //     joiObject,
          //     Joi.object().type(internals.mongoose.Schema.Types.ObjectId)
          // ]);

          joiObject._isObjectId = true;
          originalJoiObject._isObjectId = true;
          joiObject.$_terms.metas = originalJoiObject.$_terms.metas;
          joiObject._flags = originalJoiObject._flags;

          output.validate = internals.mongooseValidateWrapper.bind(
            this,
            originalJoiObject
          );
        } else {
          output[key] = joiObject.$_terms.metas[i][key];
        }
      }
    }
  }

  if (joiObject.type === "object") {
    //  Allow for empty object - https://github.com/hapijs/joi/blob/v9.0.0-3/API.md#object
    if (!joiObject.$_terms.keys)
      return { type: internals.mongoose.Schema.Types.Mixed };

    joiObject.$_terms.keys.forEach(function(child) {
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
  if (joiObject.type === "string") {
    // If the type has already been set, that's probably
    // because it was an ObjectId. In this case, don't set the
    // type as a string.
    return String;
  }

  if (joiObject.type === "number") {
    return Number;
  }

  if (joiObject.type === "date") {
    return Date;
  }

  if (joiObject.type === "boolean") {
    return Boolean;
  }

  var types = {};
  var type = [];
  var i = 0;
  var firstKey;

  if (joiObject.type === "array") {
    // Go through each of the children in the array and get their types
    for (i = 0; i < joiObject.$_terms.items.length; i++) {
      if (types[joiObject.$_terms.items[i].type]) {
        types[joiObject.$_terms.items[i].type]++;
      } else {
        types[joiObject.$_terms.items[i].type] = 1;
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
      type.push(internals.typeDeterminer({ type: firstKey }));
      return type;
    }

    if (joiObject.$_terms.items.length === 0) {
      return type;
    }

    // Collate all meta objects because these need to be pushed into the schema options
    let schemaOptions = joiObject.$_terms.metas.reduce(
      (options, currentOption) => {
        return Object.assign({}, options, currentOption);
      },
      {}
    );

    // Combine the explicit schema options with the global subdocument options
    if (internals.subdocumentOptions) {
      schemaOptions = Object.assign(
        {},
        internals.subdocumentOptions,
        schemaOptions
      );
    }

    if (
      internals.typeDeterminer(joiObject.$_terms.items[0]) !== Object &&
      internals.typeDeterminer(joiObject.$_terms.items[0]) !== Array
    ) {
      type.push(internals.convert(joiObject.$_terms.items[0]));
    } else {
      type.push(
        new internals.mongoose.Schema(
          internals.convert(joiObject.$_terms.items[0]),
          schemaOptions
        )
      );
    }

    return type;
  }

  if (joiObject.type === "alternatives") {
    types = {};

    if (joiObject.$_terms.matches.length === 0) {
      return internals.mongoose.Schema.Types.Mixed;
    }

    // Go through each of the children in the array and get their types
    for (i = 0; i < joiObject.$_terms.matches.length; i++) {
      types[joiObject.$_terms.matches[i].schema.type] = types[
        joiObject.$_terms.matches[i].schema.type
      ]
        ? types[joiObject.$_terms.matches[i].schema.type] + 1
        : (types[joiObject.$_terms.matches[i].schema.type] = 1);
    }

    // If there are multiple types, there's not much else we can do as far as Mongoose goes...
    if (Object.keys(types).length > 1) {
      return internals.mongoose.Schema.Types.Mixed;
    }

    // If there are multiple of the same type, this means that there are different schemas, but the same type :D
    firstKey = Object.keys(types)[0];
    if (types[firstKey] > 1) {
      return internals.typeDeterminer({ type: firstKey });
    }

    // If we're here, it's because there's a single type, and one schema. So actually, an alternative didn't need to be used...
    return internals.typeDeterminer(joiObject.$_terms.matches[0].schema);

    // // If there are multiple types in the items, set the type to mixed
    // mixedTypeFound = false;

    // if (joiObject.$_terms.matches.length === 0) {
    //     mixedTypeFound = true;
    // }

    // types = {};
    // joiObject.$_terms.matches.forEach(function (item) {

    //     types[item.schema.type] = true;
    // });

    // // If we have one type, then all array items are this
    // if (Object.keys(types).length === 1) {
    //     output = internals.convert(joiObject.$_terms.matches[0].schema);
    // } else {
    //     mixedTypeFound = true;
    // }

    // if (mixedTypeFound) {
    //     return internals.mongoose.Schema.Types.Mixed;
    // }

    // return output;
  }

  if (joiObject.type === "object") {
    return Object;
  }

  if (joiObject.type === "any") {
    return internals.mongoose.Schema.Types.Mixed;
  }

  throw new TypeError(
    'Unsupported Joi type: "' +
      joiObject.type +
      "\"! Raise an issue on GitHub if you'd like it to be added!"
  );
};

internals.isObjectId = joiObject => {
  if (joiObject.$_terms.metas.length > 0) {
    var toClass = {}.toString;

    for (var i = 0; i < joiObject.$_terms.metas.length; i++) {
      // Only add objects
      if (toClass.call(joiObject.$_terms.metas[i]) !== "[object Object]") {
        continue;
      }

      for (var key in joiObject.$_terms.metas[i]) {
        // Check for _objectId
        if (key === "type" && joiObject.$_terms.metas[i][key] === "ObjectId") {
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
    joiSchema = Joi.alternatives(
      joiSchema,
      Joi.object().instance(internals.mongoose.Types.ObjectId)
    );
  }

  try {
    const { error } = joiSchema.validate(value, internals.joiGlobalOptions);
    if (error) return false;
    return true;
  } catch (err) {
    try {
      await joiSchema.validateAsync(value, internals.joiGlobalOptions);
      return true;
    } catch (err) {
      return false;
    }
  }
};

module.exports = internals.root;
