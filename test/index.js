"use strict";

const Joi = require("@hapi/joi");
const Mongoose = require("mongoose");
Mongoose.Promise = global.Promise;

// Joi shortcuts
const S = Joi.string.bind(Joi);
const N = Joi.number.bind(Joi);
const O = Joi.object.bind(Joi);
const A = Joi.array.bind(Joi);
const L = Joi.alternatives.bind(Joi);
const D = Joi.date.bind(Joi);
const B = Joi.boolean.bind(Joi);
const Y = Joi.binary.bind(Joi);
const Any = Joi.any.bind(Joi);

// Test shortcuts
const Code = require("code");
const Lab = require("lab");
const lab = (module.exports.lab = Lab.script());

const { describe, it, before } = lab;
const { expect, fail } = Code;

describe("Joigoose initializer", () => {
  it("should allow for global Joi configuration options to be passed in", async () => {
    const Joigoose = require("../lib")(Mongoose, { convert: false });

    const schemaWithAString = O({
      favouriteHex: S().lowercase()
    });

    const mongooseUserSchema = Joigoose.convert(schemaWithAString);
    const User = Mongoose.model("User4", mongooseUserSchema);

    const newUser = new User({
      favouriteHex: "ABCDEF"
    });

    try {
      await newUser.validate();
      fail("Should not be here");
    } catch (err) {
      expect(err.message).to.not.equal("Should not be here");
      expect(err.errors.favouriteHex.message).to.equal(
        "Validator failed for path `favouriteHex` with value `ABCDEF`"
      );
    }
  });
});

describe("Joigoose converter", () => {
  let Joigoose;

  before(() => {
    Joigoose = require("../lib")(Mongoose);
  });

  it("cannot convert a blank object", () => {
    expect(() => {
      Joigoose.convert();
    }).to.throw(Error, "Ensure the value you're trying to convert exists!");
  });

  it("should not try to convert a non-Joi object", () => {
    expect(() => {
      Joigoose.convert("hello!");
    }).to.throw(Error, "Object schema must be a valid object");
  });

  it("should convert a string object", () => {
    const output = Joigoose.convert(S());
    expect(output.type).to.equal(String);
    expect(output.validate).to.exist();
  });

  it("should convert a Joi object to a Mongoose schema", () => {
    const output = Joigoose.convert(O());

    expect(output.type).to.equal(Mongoose.Schema.Types.Mixed);
  });

  it("should convert a Joi object with a string to a Mongoose schema", () => {
    const output = Joigoose.convert(O({ name: S() }));

    expect(output).to.exist();
    expect(output.name).to.exist();
    expect(output.name.type).to.exist();
    expect(output.name.validate).to.exist();
    expect(output.name.type).to.equal(String);
    expect(output.name.validate).to.exist();
  });

  it("should convert a Joi array with object of strings to a Mongoose schema", () => {
    const output = Joigoose.convert(A().items({ foo: S() }));
    expect(output.type).to.be.an.array();
    expect(output.type.length).to.equal(1);
    expect(output.type[0]).to.be.instanceof(Mongoose.Schema);
    expect(output.type[0].paths.foo.instance).to.equal("String");
    expect(output.type[0].paths.foo.options.validate).to.exist();
  });

  it("should convert a Joi array with strings to a Mongoose schema", () => {
    const output = Joigoose.convert(A().items(S()));
    expect(output.type).to.be.an.array();
    expect(output.type.length).to.equal(1);
    expect(output.type[0].type).to.equal(String);
  });

  it("should convert a Joi array with numbers to a Mongoose schema", () => {
    const output = Joigoose.convert(A().items(N()));
    expect(output.type).to.be.an.array();
    expect(output.type.length).to.equal(1);
    expect(output.type[0].type).to.equal(Number);
  });

  it("should convert a Joi array with dates to a Mongoose schema", () => {
    const output = Joigoose.convert(A().items(D()));
    expect(output.type).to.be.an.array();
    expect(output.type.length).to.equal(1);
    expect(output.type[0].type).to.equal(Date);
  });

  it("should convert a Joi array with booleans to a Mongoose schema", () => {
    const output = Joigoose.convert(A().items(B()));
    expect(output.type).to.be.an.array();
    expect(output.type.length).to.equal(1);
    expect(output.type[0].type).to.equal(Boolean);
  });

  it("should convert a Joi object with a number to a Mongoose schema", () => {
    const output = Joigoose.convert(O({ age: N() }));
    expect(output.age.type).to.equal(Number);
    expect(output.age.validate).to.exist();
  });

  it("should convert a Joi object with a date to a Mongoose schema", () => {
    const output = Joigoose.convert(O({ birthday: D() }));
    expect(output.birthday.type).to.equal(Date);
    expect(output.birthday.validate).to.exist();
  });

  it("should convert a Joi object with an ObjectId and reference to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({
        m_id: S()
          .regex(/^[0-9a-fA-F]{24}$/)
          .meta({ type: "ObjectId", ref: "Merchant" })
      })
    );

    expect(output.m_id.type).to.equal(Mongoose.Schema.Types.ObjectId);
    expect(output.m_id.ref).to.equal("Merchant");
    expect(output.m_id.validate).to.exist();
  });

  it("should convert a Joi object with an array containing an ObjectId to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({
        name: S(),
        merchants: A().items(
          O({
            _id: S()
              .regex(/^[0-9a-fA-F]{24}$/)
              .meta({ type: "ObjectId", ref: "Merchant" }),
            name: S()
          })
        )
      })
    );

    expect(output.name.type).to.equal(String);
    expect(output.merchants.type[0].paths._id.instance).to.equal("ObjectID");
  });

  it("should convert a Joi object with an array containing an ObjectId added after the initial object was set up to a Mongoose schema", () => {
    const schema = O({
      name: S()
    });

    const updatedSchema = schema.keys({
      merchants: A().items(
        O({
          _id: S()
            .regex(/^[0-9a-fA-F]{24}$/)
            .meta({ type: "ObjectId", ref: "Merchant" }),
          name: S()
        })
      )
    });

    const output = Joigoose.convert(updatedSchema);

    expect(output.name.type).to.equal(String);
    expect(output.merchants.type[0].paths._id.instance).to.equal("ObjectID");
  });

  it("should convert a Joi object with a Mixed type to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({
        other_info: Any()
      })
    );

    expect(output.other_info.type).to.equal(Mongoose.Schema.Types.Mixed);
    expect(output.other_info.validate).to.exist();
  });

  it("should convert a Joi object with a boolean to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({
        enabled: B()
      })
    );

    expect(output.enabled.type).to.equal(Boolean);
    expect(output.enabled.validate).to.exist();
  });

  it("should convert a Joi object with an array of undefined types to a Mongoose schema", () => {
    const output = Joigoose.convert(O({ hobbies: A() }));

    expect(output.hobbies.type).to.equal([]);
    expect(output.hobbies.type.validate).to.not.exist();
  });

  it("should convert a Joi object with an array of strings to a Mongoose schema", () => {
    const output = Joigoose.convert(O({ hobbies: A().items(S()) }));

    expect(output.hobbies.type[0].type).to.equal(String);
    expect(output.hobbies.type[0].validate).to.exist();
  });

  it("should convert a Joi object with an array of strings with different schemas to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({ hobbies: A().items(S().length(10), S().valid("yo!")) })
    );

    expect(output.hobbies.type[0]).to.equal(String);
  });

  it("should convert a Joi object with alternatives of zero types to a Mongoose schema", () => {
    const output = Joigoose.convert(O({ favouriteNumber: L() }));
    expect(output.favouriteNumber.type).to.equal(Mongoose.Schema.Types.Mixed);
  });

  it("should convert a Joi object with alternatives of the same type to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({ contactDetail: L([S().regex(/\+\d/i), S().email()]) })
    );

    expect(output.contactDetail.type).to.equal(String);
  });

  it("should convert a Joi object with alternatives containing one type with one scema to a Mongoose schema", () => {
    const output = Joigoose.convert(O({ contactDetail: L([S().email()]) }));

    expect(output.contactDetail.type).to.equal(String);
  });

  it("should convert a Joi object with alternatives of different types to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({ favouriteNumber: L([S(), N().integer()]) })
    );

    expect(output.favouriteNumber.type).to.equal(Mongoose.Schema.Types.Mixed);
  });

  it("should convert a Joi object with an array of mixed types to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({
        hobbies: A()
          .single()
          .items(S(), N())
      })
    );

    expect(output.hobbies.type[0]).to.equal(Mongoose.Schema.Types.Mixed);
    expect(output.hobbies.validate).to.not.exist();
  });

  it("should convert a Joi object with a string and a number to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({
        age: N(),
        name: S()
      })
    );

    expect(output.age.type).to.equal(Number);
    expect(output.name.type).to.equal(String);
    expect(output.age.validate).to.exist();
  });

  it("should convert a nested Joi object to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({
        name: O({
          first: S(),
          last: S()
        })
      })
    );

    expect(output.name.first.type).to.equal(String);
    expect(output.name.first.validate).to.exist();
    expect(output.name.last.type).to.equal(String);
    expect(output.name.last.validate).to.exist();
  });

  it("should convert a nested required Joi object to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({
        name: O({
          first: S(),
          last: S()
        }).required()
      })
    );

    expect(output.name.required).to.not.exist();
  });

  it("should convert a Joi object with a required string to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({
        name: S().required()
      })
    );

    expect(output.name.type).to.equal(String);
    expect(output.name.required).to.equal(true);
    expect(output.name.validate).to.exist();
  });

  it("should convert a Joi object with a default value to a Mongoose schema", () => {
    const output = Joigoose.convert(
      O({
        name: S().default("Barry White")
      })
    );

    expect(output.name.type).to.equal(String);
    expect(output.name.default).to.equal("Barry White");
    expect(output.name.validate).to.exist();
  });

  it("should convert a Joi object with metadata to a Mongoose schema including the metadata", () => {
    const output = Joigoose.convert(
      O({
        name: S().meta({ index: true })
      })
    );

    expect(output.name.type).to.equal(String);
    expect(output.name.index).to.equal(true);
    expect(output.name.validate).to.exist();
  });

  it("should convert a Joi object with multiple metadatas to a Mongoose schema including the metadatas", () => {
    const output = Joigoose.convert(
      O({
        name: S()
          .meta({ index: true })
          .meta({ bud: true })
      })
    );

    expect(output.name.type).to.equal(String);
    expect(output.name.index).to.equal(true);
    expect(output.name.bud).to.equal(true);
    expect(output.name.validate).to.exist();
  });

  it("should convert a Joi object with metadata to a Mongoose schema including the metadata objects, excluding metadata strings", () => {
    const output = Joigoose.convert(
      O({
        name: S()
          .meta({ index: true })
          .meta("no no no")
      })
    );

    expect(output.name.type).to.equal(String);
    expect(output.name.index).to.equal(true);
    expect(output.name.validate).to.exist();
  });

  it("should convert a Joi object with metadata to a Mongoose schema excluding metadata strings", () => {
    const output = Joigoose.convert(
      O({
        name: S().meta("no no no")
      })
    );

    expect(output.name.type).to.equal(String);
    expect(output.name.validate).to.exist();
  });

  it("cannot convert a Joi object with an unsupported type", () => {
    expect(() => {
      Joigoose.convert(
        O({
          image: Y()
        })
      );
    }).to.throw(
      Error,
      'Unsupported Joi type: "binary"! Raise an issue on GitHub if you\'d like it to be added!'
    );
  });

  it("should convert a Joi object with metadata to a Mongoose schema including the metadata objects, excluding metadata strings", () => {
    const output = Joigoose.convert(
      O({
        name: S()
          .meta({ index: true })
          .meta("no no no")
      })
    );

    expect(output.name.type).to.equal(String);
    expect(output.name.index).to.equal(true);
    expect(output.name.validate).to.exist();
  });
});

describe("Joigoose mongoose validation wrapper", () => {
  let Joigoose;

  before(() => {
    Joigoose = require("../lib")(Mongoose);
  });

  it("throws an error for a failed validation", async () => {
    try {
      await Joigoose.mongooseValidateWrapper(B(), "obvsnotaboolean");
    } catch (err) {
      expect(err.message).to.equal('"value" must be a boolean');
    }
  });

  it("returns validated input for a successful validation", async () => {
    const result = await Joigoose.mongooseValidateWrapper(
      S(),
      "defsisastringyo"
    );
    expect(result).to.equal(true);
  });
});

describe("Joigoose integration tests", () => {
  let Joigoose;
  let joiUserSchema;

  describe("when joigoose is created with defaults", () => {
    before(() => {
      Joigoose = require("../lib")(Mongoose);
      joiUserSchema = O({
        name: O({
          first: S().required(),
          last: S().required()
        }),
        email: S()
          .email()
          .required(),
        verified: B()
      });
    });

    it("should generate and validate a schema using a Joi object", async () => {
      const mongooseUserSchema = Joigoose.convert(joiUserSchema);
      const User = Mongoose.model("User", mongooseUserSchema);

      const newUser = new User({
        name: {
          first: "Barry",
          last: "White"
        },
        email: "barry@white.com",
        verified: false
      });

      await newUser.validate();
    });

    it("should generate and unsuccessfully validate a schema using a Joi object", async () => {
      const mongooseUserSchema = Joigoose.convert(joiUserSchema);
      const User = Mongoose.model("User2", mongooseUserSchema);

      const newUser = new User({
        name: {
          first: "Barry",
          last: "White"
        },
        email: "Im not an email address!"
      });

      try {
        await newUser.validate();
        fail("Should not be here");
      } catch (err) {
        expect(err.message).to.equal(
          "User2 validation failed: email: Validator failed for path `email` with value `Im not an email address!`"
        );
      }
    });

    it("should validate ObjectIds as strings", async () => {
      const joiUserSchemaWithObjectId = O({
        _id: S()
          .regex(/^[0-9a-fA-F]{24}$/)
          .meta({ type: "ObjectId" })
          .required(),
        name: O({
          first: S().required(),
          last: S().required()
        }),
        email: S()
          .email()
          .required()
      });

      const mongooseUserSchema = Joigoose.convert(joiUserSchemaWithObjectId);
      const User = Mongoose.model("User3", mongooseUserSchema);

      const newUser = new User({
        _id: "abcdef012345abcdef012345",
        name: {
          first: "Barry",
          last: "White"
        },
        email: "barry@white.com"
      });

      await newUser.validate();
    });

    it("should validate ObjectIds as ObjectIds", async () => {
      const joiUserSchemaWithObjectId = O({
        _id: S()
          .regex(/^[0-9a-fA-F]{24}$/)
          .meta({ type: "ObjectId" })
          .required(),
        name: O({
          first: S().required(),
          last: S().required()
        }),
        email: S()
          .email()
          .required()
      });

      const mongooseUserSchema = Joigoose.convert(joiUserSchemaWithObjectId);
      const User = Mongoose.model("User3b", mongooseUserSchema);

      const newUser = new User({
        _id: new Mongoose.Types.ObjectId("abcdef012345abcdef012345"),
        name: {
          first: "Barry",
          last: "White"
        },
        email: "barry@white.com"
      });

      await newUser.validate();
      expect(newUser._id.toString()).to.equal("abcdef012345abcdef012345");
    });

    it("should validate nested ObjectIds as strings", async () => {
      const hobbiesSchema = O({
        _id: S()
          .regex(/^[0-9a-fA-F]{24}$/)
          .meta({ type: "ObjectId", ref: "Hobby" })
          .required(),
        name: S().required()
      });

      const joiUserSchemaWithObjectId = O({
        hobbies: A().items(hobbiesSchema)
      });

      const mongooseUserSchema = Joigoose.convert(joiUserSchemaWithObjectId);
      const User = Mongoose.model("UserHobbies", mongooseUserSchema);

      const newUser = new User({
        hobbies: [
          {
            _id: "abcdef012345abcdef012345",
            name: "cycling"
          },
          {
            _id: "abcdef012345abcdef01234a",
            name: "running"
          }
        ]
      });

      await newUser.validate();
    });

    it("should validate nested ObjectIds as actual ObjectId objects", async () => {
      const hobbiesSchema = O({
        _id: S()
          .regex(/^[0-9a-fA-F]{24}$/)
          .meta({ type: "ObjectId", ref: "Hobby" })
          .required(),
        name: S().required()
      });

      const joiUserSchemaWithObjectId = O({
        hobbies: A().items(hobbiesSchema)
      });

      const mongooseUserSchema = Joigoose.convert(joiUserSchemaWithObjectId);
      const User = Mongoose.model("UserHobbies2", mongooseUserSchema);

      const newUser = new User({
        hobbies: [
          {
            _id: new Mongoose.Types.ObjectId("abcdef012345abcdef012345"),
            name: "cycling"
          },
          {
            _id: new Mongoose.Types.ObjectId("abcdef012345abcdef01234a"),
            name: "running"
          }
        ]
      });

      await newUser.validate();
    });

    it("should validate ObjectIds in arrays", async () => {
      const joiUserSchemaWithObjectId = O({
        _id: S()
          .regex(/^[0-9a-fA-F]{24}$/)
          .meta({ type: "ObjectId" }),
        hobbies: A().items(
          S()
            .regex(/^[0-9a-fA-F]{24}$/)
            .meta({ type: "ObjectId", ref: "Hobby" })
        )
      });

      const mongooseUserSchema = Joigoose.convert(joiUserSchemaWithObjectId);
      const User = Mongoose.model("UserHobbies3", mongooseUserSchema);

      const newUser = new User({
        hobbies: [
          new Mongoose.Types.ObjectId("abcdef012345abcdef012345"),
          new Mongoose.Types.ObjectId("abcdef012345abcdef01234a")
        ]
      });

      await newUser.validate();
    });

    it("should apply defaults when they're not specified", async () => {
      const joiUserSchema = O({
        name: O({
          first: S().default("Barry"),
          last: S().default("White")
        }),
        // registered: B().default(false),
        age: N().default(21),
        hobbies: A().default(["cycling"])
      });

      const mongooseUserSchema = Joigoose.convert(joiUserSchema);
      const User = Mongoose.model("User5", mongooseUserSchema);

      const newUser = new User();

      expect(newUser.name.first).to.equal("Barry");
      expect(newUser.name.last).to.equal("White");
      // expect(newUser.registered).to.equal(false);
      expect(newUser.age).to.equal(21);
      expect(newUser.hobbies).to.equal(["cycling"]);

      await newUser.validate();
    });

    it("should make sure value exists in the wrapper", async () => {
      const joiUserSchema = O({
        name: S()
      });

      const mongooseUserSchema = Joigoose.convert(joiUserSchema);
      const User = Mongoose.model("User6", mongooseUserSchema);

      const newUser = new User({
        name: null
      });

      try {
        await newUser.validate();
      } catch (err) {
        expect(err.message).to.equal(
          "User6 validation failed: name: Validator failed for path `name` with value `null`"
        );
      }
    });

    it("should deal with alternative validation properly", async () => {
      const schema = O({
        delivery_period: L([
          O({
            min: N()
              .min(0)
              .integer()
              .empty([null, ""]),
            max: N()
              .min(0)
              .integer()
              .empty([null, ""])
          }).description(
            "A range of days relative to now when this order will arrive."
          ),
          N()
            .integer()
            .min(0)
            .max(6)
            .empty([null, ""])
            .description(
              "A absolute day of the week when this order will arrive."
            )
        ])
      });

      const mongooseSchema = Joigoose.convert(schema);
      const DeliveryMethod = Mongoose.model("DeliveryMethod", mongooseSchema);

      const deliveryMethod = new DeliveryMethod({
        delivery_period: {
          min: 1,
          max: 2
        }
      });

      const deliveryMethod2 = new DeliveryMethod({
        delivery_period: 5
      });

      const deliveryMethod3 = new DeliveryMethod({
        delivery_period: "lol"
      });

      await deliveryMethod.validate();
      await deliveryMethod2.validate();

      try {
        await deliveryMethod3.validate();
        fail("Should not be here");
      } catch (err) {
        expect(err.message).to.not.equal("Should not be here");
      }
    });

    it("should deal with alternative validation properly where the alternatives are two different objects", async () => {
      const schema = O({
        delivery_period: L([
          O({
            min: N()
              .min(0)
              .integer()
              .empty([null, ""]),
            max: N()
              .min(0)
              .integer()
              .empty([null, ""])
          }).description(
            "A range of days relative to now when this order will arrive."
          ),
          O({
            lower: N()
              .min(0)
              .integer()
              .empty([null, ""]),
            upper: N()
              .min(0)
              .integer()
              .empty([null, ""])
          }).description(
            "A range of days relative to now when this order will arrive."
          )
        ])
      });

      const mongooseSchema = Joigoose.convert(schema);
      const DeliveryMethod = Mongoose.model("DeliveryMethod2", mongooseSchema);

      const deliveryMethod = new DeliveryMethod({
        delivery_period: {
          min: 1,
          max: 2
        }
      });

      const deliveryMethod2 = new DeliveryMethod({
        delivery_period: {
          lower: 10,
          upper: 20
        }
      });

      const deliveryMethod3 = new DeliveryMethod({
        delivery_period: "lol"
      });

      await deliveryMethod.validate();
      await deliveryMethod2.validate();

      try {
        await deliveryMethod3.validate();
        fail("Should not be here");
      } catch (err) {
        expect(err.message).to.not.equal("Should not be here");
      }
    });
  });

  describe("when joigoose is created with mongoose options", () => {
    before(() => {
      Joigoose = require("../lib")(Mongoose, null, { _id: false });
      joiUserSchema = O({
        favourite_colours: A().items({ name: S(), hex: S() }),
        addresses: A()
          .items({ line1: S(), line2: S() })
          .meta({ _id: true })
      });
    });

    it("should generate and validate a schema using a Joi object using global subdocument options", async () => {
      const mongooseUserSchema = Joigoose.convert(joiUserSchema);
      const User = Mongoose.model("UserWithColours", mongooseUserSchema);

      const newUser = new User({
        favourite_colours: [
          {
            name: "red",
            hex: "ff0000"
          },
          {
            name: "green",
            hex: "00ff00"
          }
        ]
      });

      await newUser.validate();
      expect(newUser.favourite_colours[0]._id).to.not.exist();
    });

    it("should generate and validate a schema using a Joi object with global subdocument options overidden", async () => {
      const mongooseUserSchema = Joigoose.convert(joiUserSchema);
      const User = Mongoose.model("UserWithAddress", mongooseUserSchema);

      const newUser = new User({
        addresses: [
          {
            line1: "line1",
            line2: "line2"
          },
          {
            line1: "street",
            line2: "apartment"
          }
        ]
      });

      await newUser.validate();

      expect(newUser.addresses[0]._id).to.exist();
    });
  });
});
