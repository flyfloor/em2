import User from './example/User'
import Post from './example/Post'
import Comment from './example/Comment'


User.findOne(20).then(data => {

})

User.find().then(data => {
    
})

User.request('get', '/v1/user', {id: 20, name: 'ss'}).then(data => {
    console.log(data)
})

Comment.findOne({_id: 20, user_id: '239233'}, {content: undefined, name: 's', age: 2}).then(data => {
    console.log(data)
})


Post.findOne({_id: 20, name: 'ss'}).then(data => {
    console.log(data)
})

Post.find({name: 'ss'}).then(data => {
    console.log(data)
})

User.save({id: 20, name: 's', age: 10}).then(data => {
    console.log(data)
})
