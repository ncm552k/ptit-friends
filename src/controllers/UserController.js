const db = require('../utils/db');
const queryStrings = require('../utils/db/queryString');

const userModel = require('../models/UserModel');
const accountModel = require('../models/AccountModel');
const friendRequestModel = require('../models/FriendRequestModel');
const connectionModel = require('../models/ConnectionModel');
const messageBoxModel = require('../models/MessageBoxModel');

const { ADMIN, NORMAL_USER } = accountModel.ROLE_CONSTANT;

const { hash, compareHash } = require('../utils/bcrypt');

class UserController {

    // [POST] /user/register
    async register(req, res) {
        const { username, password, email } = req.body;

        try {
            const result = await db.query(`${queryStrings.read.byUserName} OR email = $2`, [username, email]);

            if (result.rowCount > 0) {
                const msg = {};
                if (username === result.rows[0].username)
                    msg.username = 'Username is already exist';
                if (email === result.rows[0].email)
                    msg.email = 'Email is already exist';
                msg.state = false
                return res.json(msg);
            }

            const hashedPassword = await hash(password);
            await db.query(queryStrings.create.user, [username, hashedPassword, email]);

            res.status(201).json({ state: true });
        } catch (error) {
            console.log(error);
            return res.status(503).json({ msg: 'Server got some error. Please try again later.' });
        }
    }

    // [POST] /user/login
    async login(req, res) {
        const authResult = await userModel.auth(req.body);

        // if (authResult.error) {
        //     return res.status(503).json({ msg: 'Server got some error. Please try again later.' });
        // }

        if (authResult.state) {
            const { user, role } = authResult;

            req.session.user = { userId: user.userId, fName: user.fName, role: role };
            res.cookie('userId', user.userId)

            switch (role) {
                case NORMAL_USER:
                    return res.status(200).json({ redirectPath: '/' });
                case ADMIN:
                    return res.status(200).json({ redirectPath: '/admin' });
            }
        }

        return res.json({ msg: 'Incorrect username or password!' });
    }

    // [POST] /user/logout
    async logout(req, res) {
        req.session.destroy((error) => {
            if (error)
                return res.status(503).json({ msg: 'Server got some error. Please try again later.' });
            res.status(201).json({ state: true, redirectPath: '/welcome' });
        });
    }

    // [GET] /user/get-info/:id
    async getUserInfo(req, res) {
        const { id: userId } = req.params;

        try {
            const results = await Promise.all([
                userModel.getUserById(userId),
                userModel.getUsersHobbies([userId])
            ]);

            const user = results[0][0];
            user.hobbies = results[1].map((hobby) => {
                return hobby.hobbyType;
            });

            res.status(200).json({ user })
        } catch (error) {
            console.log(error);
            res.status(503).json({ msg: 'Server got some error. Please try again later.' });
        }
    }

    // [POST] /user/send-friend-request
    async sendFriendRequest(req, res) {
        const { chosenList } = req.body;
        const userId = req.session.user.userId;

        try {
            await chosenList.forEach((targetId) => {
                friendRequestModel.createFriendRequest(userId, targetId);
            });

            res.status(201).json({ state: true });
        } catch (error) {
            console.log(error);
            res.status(503).json({ msg: 'Server got some error. Please try again later.' });
        }

    }

    // [GET] /user/friend-request
    async getFriendRequest(req, res) {
        const userId = req.session.user.userId;

        try {
            const senderList = await userModel.getFriendRequestList(userId);

            res.render('friendrequest', { renderHeaderPartial: true, user: req.session.user, senderList });
        } catch (error) {
            console.log(error);
            res.status(503).json({ msg: 'Server got some error. Please try again later.' });
        }
    }

    // [POST] /user/respond-friend-request
    async respondFriendRequest(req, res) {
        const { senderId, responseState } = req.body;
        const userId = req.session.user.userId;

        try {
            await Promise.all([
                friendRequestModel.changeState(true, userId, senderId),
                (responseState ?
                    [
                        connectionModel.createConnections(userId, senderId, true, false),
                        messageBoxModel.createMessageBox(userId, senderId)
                    ]
                    : true
                )
            ]);

            res.status(201).json({ state: true });
        } catch (error) {
            console.log(error);
            res.status(503).json({ msg: 'Server got some error. Please try again later.' });
        }
    }
}

module.exports = new UserController;