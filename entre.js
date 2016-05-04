import User from './src/example/user';
import Post from './src/example/post';
import EM2 from './src/model';

let params = {age: '20', sex: {a:'s'}}
let users = User.update(20, params).then(data => {
    console.log(data, 'succ')
}).catch(error => {
    console.log(error, 'error')
})
