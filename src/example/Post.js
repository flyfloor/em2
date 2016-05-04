import EM2 from '../model' 

let model = {
    name: 'post',
    url: '/v1/post',
    fields: ['title', 'content'],
}

const Post = new EM2(model)

export default Post