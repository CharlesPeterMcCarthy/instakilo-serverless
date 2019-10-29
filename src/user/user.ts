import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { UserBrief, User } from '@instakilo/common';

export default class UserUtils {

    static dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    static getDetails = async (userId: string): Promise<User> => {

        const params = {
            TableName: 'INS-USERS',
            Key: {
                _id: userId
            }
        };

        const res = await UserUtils.dynamo.get(params).promise();
        return res.Item as User;
    }

    static getBriefDetails = async (userId: string): Promise<UserBrief> => {

        const params = {
            TableName: 'INS-USERS',
            Key: {
                _id: userId
            },
            ProjectionExpression: '#id, username, avatar',
            ExpressionAttributeNames: {
                '#id': '_id'
            }
        };

        const res = await UserUtils.dynamo.get(params).promise();
        return res.Item as UserBrief;
    }

}
