import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { UserBrief, User } from '@instakilo/common';

export default class UserUtils {

    static dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    static getDetails = async (userId: string): Promise<User> => UserUtils.queryUser(userId, false);

    static getBriefDetails = async (userId: string): Promise<UserBrief> => UserUtils.queryUser(userId, true);

    static getPostIds = async (userId: string): Promise<string[]> => {
        const params = {
            TableName: 'INS-USERS',
            Key: {
                _id: userId
            },
            ProjectionExpression: 'posts'
        };

        const res = await UserUtils.dynamo.get(params).promise();
        return res.Item && res.Item.posts;
    }

    static queryUser = async (userId: string, brief: boolean): Promise<User> => {
        const params = {
            TableName: 'INS-USERS',
            Key: {
                _id: userId
            },
            ProjectionExpression: brief ? '#id, username, avatar' : undefined,
            ExpressionAttributeNames: brief ? {
                '#id': '_id'
            } : undefined
        };

        const res = await UserUtils.dynamo.get(params).promise();
        return res.Item as User;
    }

}
