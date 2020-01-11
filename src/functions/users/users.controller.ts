import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import Response from '../../responses/api.responses';
import { EditProfile, UserBrief } from '@instakilo/common';
import Auth from '../../auth/verify';
import UserUtils from '../../user/user';
import ErrorTypes from '../../responses/error.types';

export class UsersController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public getMyProfile = async (event) => {
        console.log(event);
        const data = JSON.parse(event.body);
        const { token }: { token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed(ErrorTypes.AUTH_INVALID());

        try {
            const user: UserBrief = await UserUtils.getBriefDetails(auth.sub);
            if (!user) return Response.notFound(ErrorTypes.USER_NOT_FOUND());

            const res = await this.getProfile(auth.sub, '#id, username, avatar, firstName, lastName, dob, times.signedUpAt, email'); // Show email
            const profile = res.Item;

            if (!profile) return Response.error(ErrorTypes.USER_NOT_FOUND());

            return Response.success({ profile });
        } catch (err) {
            console.error(err);
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to retrieve your user profile'));
        }
    }

    public getOtherUserProfile = async (event) => {
        console.log(event);
        const data = JSON.parse(event.body);
        const { userId, token }: { userId: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed(ErrorTypes.AUTH_INVALID());

        try {
            const user: UserBrief = await UserUtils.getBriefDetails(auth.sub);
            if (!user) return Response.notFound(ErrorTypes.USER_NOT_FOUND());

            const res = await this.getProfile(userId, '#id, username, avatar, firstName, lastName, dob, times.signedUpAt');
            const profile = res.Item;

            if (!profile) return Response.error(ErrorTypes.USER_NOT_FOUND());

            return Response.success({ profile });
        } catch (err) {
            console.error(err);
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to retrieve other user profile'));
        }
    }

    public editProfile = async (event) => {
        console.log(event);
        const data = JSON.parse(event.body);
        const { userData, token }: { userData: EditProfile, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed(ErrorTypes.AUTH_INVALID());

        try {
            await this.updateUser(userData, auth.sub);

            return Response.success();
        } catch (err) {
            console.error(err);
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to retrieve other user profile'));
        }
    }

    private getProfile = async (userId: string, fields: string) => {
        const params = {
            TableName: 'INS-USERS',
            Key: {
                _id: userId
            },
            ProjectionExpression: fields,
            ExpressionAttributeNames: {
                '#id': '_id'
            }
        };

        console.log(params);

        return await this.dynamo.get(params).promise();
    }

    private updateUser = async (userData: EditProfile, userId: string) => {
        const { firstName, lastName, dob } = userData;

        if (!firstName) throw 'First Name is missing';
        if (!lastName) throw 'Last Name is missing';
        if (!dob) throw 'DOB is missing';

        const params = {
            TableName: 'INS-USERS',
            Key: {
                _id: userId
            },
            UpdateExpression: 'SET firstName = :f, lastName = :l, dob = :d',
            ExpressionAttributeValues: {
                ':f': firstName,
                ':l': lastName,
                ':d': dob
            },
            ReturnValues: 'UPDATED_NEW'
        };

        return await this.dynamo.update(params).promise();
    }

}
