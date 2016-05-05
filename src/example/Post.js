import EM2 from '../model' 

export default new EM2({
    name: 'post',
    url: '/v1/post',
    fields: ['title', 'content', 'footer'],
})