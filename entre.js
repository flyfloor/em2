import User from './src/example/user';
import Post from './src/example/post';
import Comment from './src/example/comment';
import EM2 from './src/model';

let params = {id: 20, age: 20, name: 'jerry', gender: 'male'}
let users = User.destroy(params).then(data => {
    console.log(data, 'succ')
}).catch(error => {
    console.log(error, 'error')
})
