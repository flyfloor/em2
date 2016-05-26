import User from './example/User';
import Post from './example/Post';

User.request('get', '/v1/user', {id: 20, name: 'ss'}).then(data => {
    console.log(data)
})


Post.findOne({_id: 20, name: 'ss'}).then(data => {
    console.log(data)
})

User.save({id: 20, name: 's', age: 10}).then(data => {
    console.log(data)
})

window.User = User