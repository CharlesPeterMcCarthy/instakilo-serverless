import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import Response from '../../responses/api.responses';
import {Post, UserBrief} from '@instakilo/common';
import uuidv4 from 'uuid/v4';
import Auth from '../../auth/verify';
import UserUtils from '../../user/user';
import {PostUpdateInfo} from './posts.interfaces';

export class PostsController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public create = async (event) => {
        const data = JSON.parse(event.body);
        const { post, token }: { post: Post, token: string } = data;

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

    public delete = async (event) => {
        const data = JSON.parse(event.body);
        const { postId, token }: { postId: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.error({ success: false, error: 'Authentication Invalid' });

        try {
            await this.deletePost(postId, auth.sub);

            return Response.success({ success: true });
        } catch (err) {
            console.error(err);
            if (err.code === 'ConditionalCheckFailedException') return Response.error({ success: false, error: 'User is not authorised to delete this post' });
            return Response.error({ success: false, error: 'Unable to delete post' });
        }
    }

    public update = async (event) => {
        const data = JSON.parse(event.body);
        const { postInfo, token }: { postInfo: PostUpdateInfo, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.error({ success: false, error: 'Authentication Invalid' });

        try {
            await this.updatePost(postInfo, auth.sub);

            return Response.success({ success: true });
        } catch (err) {
            console.error(err);
            if (err.code === 'ConditionalCheckFailedException') return Response.error({ success: false, error: 'User is not authorised to update this post' });
            return Response.error({ success: false, error: 'Unable to update post' });
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

    private deletePost = (postId, userId) => {
        const params = {
            TableName: 'INS-POSTS',
            Key: {
                _id: postId
            },
            ConditionExpression: 'createdBy.#id = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            },
            ExpressionAttributeNames: {
                '#id': '_id'
            }
        }

        return this.dynamo.delete(params).promise();
    }

    private updatePost = (postInfo: PostUpdateInfo, userId: string) => {
        const params = {
            TableName: 'INS-POSTS',
            Key: {
                _id: postInfo.postId
            },
            UpdateExpression: 'SET description = :desc, hashTags = :ht, times.updatedAt = :now',
            ConditionExpression: 'createdBy.#id = :userId',
            ExpressionAttributeValues: {
                ':desc': postInfo.description,
                ':ht': postInfo.hashTags,
                ':now': new Date().toISOString(),
                ':userId': userId
            },
            ExpressionAttributeNames: {
                '#id': '_id'
            },
            ReturnValues: 'UPDATED_NEW'
        };

        return this.dynamo.update(params).promise();
    }

}
