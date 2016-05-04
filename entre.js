import User from './src/example/user';
import Post from './src/example/post';
import EM2 from './src/model';

let params = {age: 20, sex: 'male'}
let users = User.find(params).then(data => {
    console.log(data, 'succ')
}).catch(error => {
    console.log(error, 'error')
})
