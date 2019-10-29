import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import Response from '../../responses/api.responses';
import {Post, UserBrief} from '@instakilo/common';
import uuidv4 from 'uuid/v4';
import Auth from '../../auth/verify';
import UserUtils from '../../user/user';

export class PostsController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public create = async (event) => {
        const data = JSON.parse(event.body);
        const post: Post = data.post;
        const token = data.token;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.error({ success: false, error: 'Authentication Invalid' });

        const user: UserBrief = await UserUtils.getBriefDetails(auth.sub);
        if (!user) return Response.error({ success: false, error: 'Invalid user' })

        try {
            await this.savePost(post, user);

            return Response.success({ success: true });
        } catch (err) {
            console.error(err);
            return Response.error({ success: false, error: 'Unable to create post' });
        }
    }

    private savePost = (post: Post, user: UserBrief) => {
        const params = {
            TableName: 'INS-POSTS',
            Item: this.formatPostRecord(post, user)
        };

        return this.dynamo.put(params).promise();
    }

    private formatPostRecord = (post: Post, user: UserBrief) => {
        return {
            ...post,
            _id: uuidv4(),
            createdBy: user,
            times: {
                createdAt: new Date().toISOString()
            }
        }
    }

}
