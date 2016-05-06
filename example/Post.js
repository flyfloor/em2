import em2 from '../src/model' 

export default new em2({
    name: 'post',
    url: '/v1/post',
    fields: ['title', 'content', 'footer'],
})