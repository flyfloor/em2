import em2 from 'em2';

const Book = new em2({
    url: 'v1/book',
    fields: {
        title: {
            type: String,
            default: '',
        },
        author: {

        }
    },
})

export default Book;