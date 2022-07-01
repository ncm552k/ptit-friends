const siteRouter = require('./site');
const messageRouter = require('./message');
const userRouter = require('./user');
const matchingRouter = require('./matching');
const messageBoxRouter = require('./messagebox');

function router(app) {
    app.use('/user', userRouter);
    app.use('/matching', matchingRouter);
    app.use('/message-box', messageBoxRouter)
    app.use('/message', messageRouter)
    app.use('/', siteRouter)
}

module.exports = router;