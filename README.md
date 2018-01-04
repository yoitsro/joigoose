# joigoose

[![npm version](http://img.shields.io/npm/v/joigoose.svg)](https://npmjs.org/package/joigoose)
[![Build Status](https://travis-ci.org/yoitsro/joigoose.svg)](https://travis-ci.org/yoitsro/joigoose)
[![Dependencies Status](https://david-dm.org/yoitsro/joigoose.svg)](https://david-dm.org/yoitsro/joigoose)

> [Joi](https://github.com/hapijs/joi) and [Mongoose](http://mongoosejs.com/) sitting in a tree K-I-S-S-I-N-G...


Joi validation for your Mongoose models without the hassle of maintaining two schemas.

## Installation

```
npm install joigoose
```

## Usage

#### 1. Import Mongoose and Joi
We must pass Mongoose into Joigoose so it knows about ObjectIds and other Mongoose specific stuff:
```javascript
var Mongoose = require('mongoose');
var Joigoose = require('joigoose')(Mongoose);
```

#### 2. Write your Joi schema (see here about how to specify ObjectIds!)

##### Things to know!
Mongoose specific options can be specified in the `meta` object (see below).

Arrays with items of different types will end up with the Mongoose type `Mixed`.
Ideally, Joi schemas shouldn't have to contain Mongoose specific types, such as `Mongoose.Schema.Types.ObjectId` because these Joi schemas may be required to work on frontend clients too.

```javascript
var joiUserSchema = Joi.object({
    name: Joi.object({
        first: Joi.string().required(),
        last: Joi.string().required()
    }),
    email: Joi.string().email().required(),
    bestFriend: Joi.string().meta({ type: 'ObjectId', ref: 'User' }),
    metaInfo: Joi.any()
});
```

#### 3. Convert your Joi schema to a Mongoose-style schema
```javascript
var mongooseUserSchema = new Mongoose.Schema(Joigoose.convert(joiUserSchema));
```

#### 4. Create your model
```javascript
User = Mongoose.model('User', mongooseUserSchema);
```
#### 5. Enjoy!
```javascript
var aGoodUser = new User({
    name: {
        first: 'Barry',
        last: 'White'
    },
    email: 'barry@white.com',
    metaInfo: {
        hobbies: ['cycling', 'dancing', 'listening to Shpongle']
    }
});

aGoodUser.save(function (err, result) {

    // -> Success!
});

var aBadUser = new User({
    name: {
        first: 'Barry',
        last: 'White'
    },
    email: 'Im not an email address!'
});

aBadUser.save(function (err, result) {

    // -> Error!
    // {
    //     "message": "User validation failed",
    //     "name": "ValidationError",
    //     "errors": {
    //         "email": {
    //             "properties": {
    //                 "type": "user defined",
    //                 "message": "Validator failed for path `{PATH}` with value `{VALUE}`",
    //                 "path": "email",
    //                 "value": "Im not an email address!"
    //             },
    //             "message": "Validator failed for path `email` with value `Im not an email address!`",
    //             "name": "ValidatorError",
    //             "kind": "user defined",
    //             "path": "email",
    //             "value": "Im not an email address!"
    //         }
    //     }
    // }
});
```

## Known Limitations
I didn't spend long writing this, but I've aimed for 100% code coverage. It can be so much better, so help me out!
Submit your [issues and pull requests](https://github.com/yoitsro/joigoose/issues) on [GitHub](https://github.com/yoitsro/joigoose).

 - No peer based validation (`and`, `nand`, `or`, `xor`, `with`, `without`, `ref`, `assert`, `alternatives`, `when` etc)
 - No `Joi.binary` object type
 - No `Joi.func` object type
 - `Joi.boolean` default values don't seem to work properly: https://github.com/Automattic/mongoose/issues/4245
