import User from './example/User'
import Post from './example/Post'
import Comment from './example/Comment'

const finalErrFunc = (err) => {
    console.error('final error =>', err) 
}

const finalDataFunc = (data) => {
    console.log('final data =>', data)
}

User.findOne(20).then(finalDataFunc).catch(finalErrFunc)

User.find().then(finalDataFunc).catch(finalErrFunc)

User.request('get', '/v1/user', {id: 20, name: 'ss'})
    .then(finalDataFunc).catch(finalErrFunc)

Comment.findOne({ _id: 20, user_id: '239233' }, {
    content: undefined, 
    name: 's', age: 2
}).then(finalDataFunc).catch(finalErrFunc)

Comment.find({
    _id: 20, 
    user_id: '239233', 
    content: undefined, 
    name: 's', age: 2
}).then(finalDataFunc).catch(finalErrFunc)


Post.findOne({_id: 20, name: 'ss'}).then(finalDataFunc).catch(finalErrFunc)

Post.find({name: 'ss'}).then(finalDataFunc).catch(finalErrFunc)

User.save({id: 20, name: 's', age: 10}).then(finalDataFunc).catch(finalErrFunc)
