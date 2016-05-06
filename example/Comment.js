import EM2 from '../src/model' 

export default new EM2({
    name: 'comment',
    url: '/v1/comment',
    fields: [
        {
            name: 'nickname',
            type: String,
        }, {
            name: 'content',
            type: String,
            default: 'this is content'
        }, {
            name: 'uid',
        },
        'created_at'
    ]
})
