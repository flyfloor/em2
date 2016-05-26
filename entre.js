import User from './example/User';
import Post from './example/Post';

User.request('get', '/v1/user', {id: 20, name: 'ss'}).then(data => {
    console.log(data)
})


Post.destroy({_id: 20, name: 'ss'}).then(data => {
    console.log(data)
})

User.create({name: 's', age: 10}).then(data => {
    
})

window.User = User