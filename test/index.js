var Joi = require('joi');
var Mongoose = require('mongoose');

// Joi shortcuts
var S = Joi.string;
var N = Joi.number;
var O = Joi.object;
var A = Joi.array;
var L = Joi.alternatives;
var D = Joi.date;
var B = Joi.boolean;
var Y = Joi.binary;
var Any = Joi.any;

// Test shortcuts
var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

describe('Joigoose initializer', function() {

    it('should allow for global Joi configuration options to be passed in', function (done) {

        var Joigoose = require('../lib')(Mongoose, {convert: false});

        var schemaWithAString = O({
            favouriteHex: S().lowercase()
        }); 

        var mongooseUserSchema = Joigoose.convert(schemaWithAString);
        var User = Mongoose.model('User4', mongooseUserSchema);

        var newUser = new User({
            favouriteHex:  'ABCDEF'
        });

        return newUser.validate(function (err) {

            expect(err).to.exist();
            expect(err.errors.favouriteHex).to.exist();
            expect(err.errors.favouriteHex.message).to.equal('Validator failed for path `favouriteHex` with value `ABCDEF`');
            return done();
        });
    });
});

describe('Joigoose converter', function() {

    var Joigoose;

    before(function (done) {
        
        Joigoose = require('../lib')(Mongoose);
        return done();
    });
    
    it('cannot convert a blank object', function (done) {
        
        expect(function() {
            var output = Joigoose.convert();
            console.log(output);
        }).to.throw(Error, 'Ensure the value you\'re trying to convert exists!');

        return done();
    });

    it('should not try to convert a non-Joi object', function (done) {
        
        expect(function() {
            var output = Joigoose.convert('hello!');
        }).to.throw(Error, 'Object schema must be a valid object');

        return done();
    });

    it('should convert a string object', function (done) {
        
        var output = Joigoose.convert(S());
        expect(output).to.exist();
        expect(output.type).to.exist();
        expect(output.type).to.equal(String);
        expect(output.validate).to.exist();
        
        return done();
    });

    it('should convert a Joi object with a string to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ name: S() }));
        
        expect(output).to.exist();
        expect(output.name).to.exist();
        expect(output.name.type).to.exist();
        expect(output.name.validate).to.exist();
        expect(output.name.type).to.equal(String);
        expect(output.name.validate).to.exist();

        return done();
    });

    it('should convert a Joi object with a number to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ age: N() }));

        expect(output).to.exist();
        expect(output.age).to.exist();
        expect(output.age.type).to.exist();
        expect(output.age.validate).to.exist();
        expect(output.age.type).to.equal(Number);
        expect(output.age.validate).to.exist();

        return done();
    });

    it('should convert a Joi object with a date to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ birthday: D() }));

        expect(output).to.exist();
        expect(output.birthday).to.exist();
        expect(output.birthday.type).to.exist();
        expect(output.birthday.validate).to.exist();
        expect(output.birthday.type).to.equal(Date);
        expect(output.birthday.validate).to.exist();

        return done();
    });

    it('should convert a Joi object with an ObjectId to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ 
            m_id: S().regex(/^[0-9a-fA-F]{24}$/).meta({ type: 'ObjectId' })
        }));

        expect(output).to.exist();
        expect(output.m_id).to.exist();
        expect(output.m_id.type).to.exist();
        expect(output.m_id.type).to.equal(Mongoose.Schema.Types.ObjectId);
        expect(output.m_id.validate).to.exist();

        return done();
    });

    it('should convert a Joi object with a Mixed type to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ 
            other_info: Any()
        }));

        expect(output).to.exist();
        expect(output.other_info).to.exist();
        expect(output.other_info.type).to.exist();
        expect(output.other_info.type).to.equal(Mongoose.Schema.Types.Mixed);
        expect(output.other_info.validate).to.exist();

        return done();
    });

    it('should convert a Joi object with a boolean to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ 
            enabled: B()
        }));

        expect(output).to.exist();
        expect(output.enabled.type).to.equal(Boolean);
        expect(output.enabled.validate).to.exist();

        return done();
    });

    it('should convert a Joi object with an array of undefined types to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ hobbies: A() }));

        expect(output).to.exist();
        expect(output.hobbies).to.exist();
        expect(output.hobbies.type).to.exist();
        expect(output.hobbies.type).to.deep.equal([Mongoose.Schema.Types.Mixed]);
        expect(output.hobbies.type.validate).to.not.exist();

        return done();
    });

    it('should convert a Joi object with an array of strings to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ hobbies: A().items( S() ) }));

        expect(output).to.exist();
        expect(output.hobbies).to.exist();
        expect(output.hobbies.type).to.exist();
        expect(output.hobbies.type[0].type).to.equal( String );

        return done();
    });

    it('should convert a Joi object with alternatives of zero types to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ favouriteNumber: L() }));

        expect(output).to.exist();
        expect(output.favouriteNumber).to.exist();
        expect(output.favouriteNumber.type).to.equal(Mongoose.Schema.Types.Mixed);

        return done();
    });

    it('should convert a Joi object with alternatives of the same type to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ contactDetail: L([S().regex(/\+\d/i), S().email()]) }));

        expect(output).to.exist();
        expect(output.contactDetail).to.exist();
        expect(output.contactDetail.type).to.equal(String);

        return done();
    });

    it('should convert a Joi object with alternatives of different types to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ favouriteNumber: L([S(), N().integer()]) }));

        expect(output).to.exist();
        expect(output.favouriteNumber).to.exist();
        expect(output.favouriteNumber.type).to.equal(Mongoose.Schema.Types.Mixed);

        return done();
    });

    it('should convert a Joi object with an array of mixed types to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ hobbies: A().single().items(S(), N()) }));

        expect(output).to.exist();
        expect(output.hobbies).to.exist();
        expect(output.hobbies.type).to.exist();
        expect(output.hobbies.type[0]).to.equal(Mongoose.Schema.Types.Mixed);
        expect(output.hobbies.validate).to.exist();

        return done();
    });

    it('should convert a Joi object with a string and a number to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({ 
            age: N(),
            name: S()
        }));

        expect(output).to.exist();
        expect(output.age).to.exist();
        expect(output.age.type).to.exist();
        expect(output.age.type).to.equal(Number);
        expect(output.name.type).to.exist();
        expect(output.name.type).to.equal(String);
        expect(output.age.validate).to.exist();

        return done();
    });

    it('should convert a nested Joi object to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({
            name: O({
                first: S(),
                last: S()
            })
        }));

        expect(output).to.exist();
        expect(output.name).to.exist();
        expect(output.name.first).to.exist();
        expect(output.name.first.type).to.equal(String);
        expect(output.name.first.validate).to.exist();
        expect(output.name.last).to.exist();
        expect(output.name.last.type).to.equal(String);
        expect(output.name.last.validate).to.exist();

        return done();
    });

    it('should convert a nested required Joi object to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({
            name: O({
                first: S(),
                last: S()
            }).required()
        }));
        
        expect(output).to.exist();
        expect(output.name).to.exist();
        expect(output.name.required).to.not.exist();

        return done();
    });

    it('should convert a Joi object with a required string to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({
            name: S().required()
        }));

        expect(output).to.exist();
        expect(output.name).to.exist();
        expect(output.name.type).to.equal(String);
        expect(output.name.required).to.equal(true);
        expect(output.name.validate).to.exist();

        return done();
    });

    it('should convert a Joi object with a default value to a Mongoose schema', function (done) {

        var output = Joigoose.convert(O({
            name: S().default('Barry White')
        }));

        expect(output.name.type).to.equal(String);
        expect(output.name.default).to.equal('Barry White');
        expect(output.name.validate).to.exist();

        return done();
    });

    it('should convert a Joi object with metadata to a Mongoose schema including the metadata', function (done) {

        var output = Joigoose.convert(O({
            name: S().meta({ index: true })
        }));

        expect(output).to.exist();
        expect(output.name).to.exist();
        expect(output.name.type).to.equal(String);
        expect(output.name.index).to.equal(true);
        expect(output.name.validate).to.exist();

        return done();
    });

    it('should convert a Joi object with multiple metadatas to a Mongoose schema including the metadatas', function (done) {

        var output = Joigoose.convert(O({
            name: S().meta({ index: true }).meta({ bud: true })
        }));

        expect(output).to.exist();
        expect(output.name).to.exist();
        expect(output.name.type).to.equal(String);
        expect(output.name.index).to.equal(true);
        expect(output.name.bud).to.equal(true);
        expect(output.name.validate).to.exist();

        return done();
    });

    it('should convert a Joi object with metadata to a Mongoose schema including the metadata objects, excluding metadata strings', function (done) {

        var output = Joigoose.convert(O({
            name: S().meta({ index: true }).meta('no no no')
        }));

        expect(output).to.exist();
        expect(output.name).to.exist();
        expect(output.name.type).to.equal(String);
        expect(output.name.index).to.equal(true);
        expect(output.name.validate).to.exist();

        return done();
    });

    it('cannot convert a Joi object with an unsupported type', function (done) {

        expect(function() {
            var output = Joigoose.convert(O({
                image: Y() 
            }));
        }).to.throw(Error, 'Unsupported Joi type: "binary"! Raise an issue on GitHub if you\'d like it to be added!');

        return done();
    });

    it('should convert a Joi object with metadata to a Mongoose schema including the metadata objects, excluding metadata strings', function (done) {

        var output = Joigoose.convert(O({
            name: S().meta({ index: true }).meta('no no no')
        }));

        expect(output).to.exist();
        expect(output.name).to.exist();
        expect(output.name.type).to.equal(String);
        expect(output.name.index).to.equal(true);
        expect(output.name.validate).to.exist();

        return done();
    });
});

describe('Joigoose mongoose validation wrapper', function () {

    var Joigoose;

    before(function (done) {

        Joigoose = require('../lib')(Mongoose);
        return done();
    });

    
    it('returns false for a failed validation', function (done) {
        
        return Joigoose.mongooseValidateWrapper(B(), 'obvsnotaboolean', function (result) {

            expect(result).to.equal(false);
            return done();
        });
    });

    it('returns true for a successful validation', function (done) {
        
        return Joigoose.mongooseValidateWrapper(S(), 'defsisastringyo', function (result) {

            expect(result).to.equal(true);
            return done();
        });
    });
});

describe('Joigoose integration tests', function () {

    var Joigoose;
    var joiUserSchema;

    before(function (done) {

        Joigoose = require('../lib')(Mongoose);
        joiUserSchema = O({
            name: O({
                first: S().required(),
                last: S().required()
            }),
            email: S().email().required()
        });

        return done();
    });

    it('should generate and validate a schema using a Joi object', function (done) {

        var mongooseUserSchema = Joigoose.convert(joiUserSchema);
        var User = Mongoose.model('User', mongooseUserSchema);

        var newUser = new User({
            name: {
                first: 'Barry',
                last: 'White'
            },
            email: 'barry@white.com'
        });

        return newUser.validate(function (err) {

            expect(err).to.not.exist();
            return done();
        });
    });

    it('should generate and unsuccessfully validate a schema using a Joi object', function (done) {

        var mongooseUserSchema = Joigoose.convert(joiUserSchema);
        var User = Mongoose.model('User2', mongooseUserSchema);

        var newUser = new User({
            name: {
                first: 'Barry',
                last: 'White'
            },
            email: 'Im not an email address!'
        });

        return newUser.validate(function (err) {

            expect(err).to.exist();
            expect(err.message).to.equal('User2 validation failed');
            return done();
        });
    });

    it('should validate ObjectIds as strings and as actual ObjectId objects', function (done) {

        var joiUserSchemaWithObjectId = O({
            _id: S().regex(/^[0-9a-fA-F]{24}$/).meta({ type: 'ObjectId' }).required(),
            name: O({
                first: S().required(),
                last: S().required()
            }),
            email: S().email().required()
        }); 

        var mongooseUserSchema = Joigoose.convert(joiUserSchemaWithObjectId);
        var User = Mongoose.model('User3', mongooseUserSchema);

        var newUser = new User({
            _id: 'abcdef012345abcdef012345',
            name: {
                first: 'Barry',
                last: 'White'
            },
            email: 'barry@white.com'
        });

        return newUser.validate(function (err) {

            expect(err).to.not.exist();
            return done();
        });
    });

    it('should apply defaults when they\'re not specified', function (done) {

        var joiUserSchemaWithObjectId = O({
            name: O({
                first: S().default('Barry'),
                last: S().default('White')
            }),
            registered: B().default(false),
            age: N().default(21),
            hobbies: A().default(['cycling'])
        }); 

        var mongooseUserSchema = Joigoose.convert(joiUserSchemaWithObjectId);
        var User = Mongoose.model('User5', mongooseUserSchema);

        var newUser = new User();

        expect(newUser.name.first).to.equal('Barry');
        expect(newUser.name.last).to.equal('White');
        expect(newUser.registered).to.equal(false);
        expect(newUser.age).to.equal(21);
        expect(newUser.hobbies).to.deep.equal(['cycling']);

        return newUser.validate(function (err) {

            expect(err).to.not.exist();
            return done();
        });
    });
});