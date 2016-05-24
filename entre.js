import User from './example/User';
import Post from './example/Post';

User.findOne(20).then(data => {
    console.log(data)
})

Post.findOne(20).then(data => {
    console.log(data)
})

window.User = User