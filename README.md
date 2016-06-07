## em2

this is a front end easy model manager


### Usage

#### create model

```
import em2 from 'em2';

const User = new em2({
    url: [api],
    fields: [model fields, for cleaning params under POST, PUT, OPTIONS... methods]
}, {
    pkey: [id => primary key, default is '_id'],
    parseData: [function => global parseData handler, when data fetched, just after data to json object],
    exception: [function => global error handler],
})
```

fields can used three way:

```
fields: {
    name: {
        type: String,
        default: '',
    },
    age: {
        type: Number,
        default: 0,
    }
    ...
}
```

```
fields: [
    {
        name,
        type: String,
        default: '',
    },
    {
        name: 'age',
        type: Number,
        default: 0
    }
    ...
]
```

or simple way:

```
fields: ['name', 'age', ...]
```

then use it:

#### model methods

```
//GET api?name=a&sex=b
User.find({name: 'a', sex: 'b'}).then(data => {
    // after parseData if have parseData
}).catch(error => {
    // after exception if have
})
```

```
//GET api/:_id?name=a&sex=b
User.findOne(_id, params).then(succFunc).catch(errFunc)
```

```
//POST api body: params
User.create(params)...
```

```
//PUT api/:_id body:params
User.update({_id, name: 's', ...})
```

```
//POST or PUT, whether params has model's pkey
User.save(params)
```

```
//DELETE api?name=a&sex=b
User.destroy({_id, name: 'a',...})
```

#### nested model

```
const Comment = new em2({
    url: '/post/:post_id/comment'
})

// GET /post/[post_id]/comment
Comment.find({post_id, ...})

// GET /post/[post_id]/comment/[_id]
Comment.findOne({post_id, _id})
```

#### also has default request

```
// request
User.request(['get', 'post', ...], api, params).then(data => {
    // after parseData
}).catch(error => {
    // after exception
})
```

warning:
if you need model's `this`(like this.pkey, or this.fields), function **parseData** should not be write in arrow function. neither do function **exception**


