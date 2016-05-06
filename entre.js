import User from './example/user';
import Post from './example/post';
import Comment from './example/comment';

let params = {id: 20, age: 20, name: 'jerry', gender: 'male'}
let users = User.find(params).then(data => {
    console.log(data, 'succ')
}).catch(error => {
    console.log(error, 'error')
})
