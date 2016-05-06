import em2 from '../src/model' 

export default new em2({
    url: 'v1/user',
    name: 'user',
    fields: {
        name: {
            type: String,
            default: '',
        },
        age: {
            type: Number,
        },
        gender: {
            type: String,
            default: 'male'
        },
        photos: {
            type: Array,
        },
        social: {
            type: Object,
        }
    }
}, {
    pkey: 'id',
})
