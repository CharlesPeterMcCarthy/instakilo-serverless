import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import Response from '../../responses/api.responses';
import { Post, UserBrief } from '@instakilo/common';
import uuidv4 from 'uuid/v4';
import Auth from '../../auth/verify';
import UserUtils from '../../user/user';
import { PostUpdateInfo } from './posts.interfaces';

export class PostsController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public create = async (event) => {
        const data = JSON.parse(event.body);
        const { post, token }: { post: Post, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed({ code: 'auth-invalid', message: 'Authentication Invalid', custom: true });

        const user: UserBrief = await UserUtils.getBriefDetails(auth.sub);
        if (!user) return Response.notFound({ code: 'invalid-user', message: 'User does not exist', custom: true });

        try {
            const savedPost = await this.savePost(post, user);
            await this.updateAddUserPosts(savedPost._id, user._id);

            return Response.success({ success: true });
        } catch (err) {
            console.error(err);
            return Response.error({ code: 'unknown-error', message: 'Unable to create post', custom: true });
        }
    }

    public delete = async (event) => {
        const data = JSON.parse(event.body);
        const { postId, token }: { postId: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed({ code: 'auth-invalid', message: 'Authentication Invalid', custom: true });

        const user: UserBrief = await UserUtils.getBriefDetails(auth.sub);
        if (!user) return Response.notFound({ code: 'invalid-user', message: 'User does not exist', custom: true });

        try {
            await this.deletePost(postId, user._id);
            await this.updateRemoveUserPosts(postId, user._id);

            return Response.success({ success: true });
        } catch (err) {
            console.error(err);
            if (err.code === 'ConditionalCheckFailedException') return Response.error({ code: 'unauthorised-post-delete', message: 'User is not authorised to delete this post', custom: true });
            return Response.error({ code: 'unknown-error', message: 'Unable to delete post', custom: true });
        }
    }

    public update = async (event) => {
        const data = JSON.parse(event.body);
        const { postInfo, token }: { postInfo: PostUpdateInfo, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed({ code: 'auth-invalid', message: 'Authentication Invalid', custom: true });

        try {
            await this.updatePost(postInfo, auth.sub);

            return Response.success({ success: true });
        } catch (err) {
            console.error(err);
            if (err.code === 'ConditionalCheckFailedException') return Response.error({ code: 'unauthorised-post-update', message: 'User is not authorised to update this post', custom: true });
            return Response.error({ code: 'unknown-error', message: 'Unable to update post', custom: true });
        }
    }

    public queryPublic = async (event) => {
        const data = JSON.parse(event.body);
        const { limit, lastKey, token }: { limit: number, lastKey: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed({ code: 'auth-invalid', message: 'Authentication Invalid', custom: true });

        try {
            const res = await this.getPublicPosts(limit, lastKey);
            const posts = res.Items;
            const newLastKey = res.LastEvaluatedKey && res.LastEvaluatedKey._id;
            const moreAvailable = !!res.LastEvaluatedKey;

            return Response.success({ success: true, posts, lastKey: newLastKey, moreAvailable });
        } catch (err) {
            console.error(err);
            return Response.error({ code: 'unknown-error', message: 'Unable to retrieve posts', custom: true });
        }
    }

    public queryOwn = async (event) => {
        const data = JSON.parse(event.body);
        const token: string = data.token;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.error({ success: false, error: 'Authentication Invalid' });

        try {
            const postIds: string[] = await UserUtils.getPostIds(auth.sub);
            const res = await this.getPosts(postIds);
            const posts = res.Items;

            return Response.success({ success: true, posts });
        } catch (err) {
            console.error(err);
            return Response.error({ code: 'unknown-error', message: 'Unable to retrieve posts', custom: true });
        }
    }

    public querySingle = async (event) => {
        const data = JSON.parse(event.body);
        const { postId, token}: { postId: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.error({ success: false, error: 'Authentication Invalid' });

        try {
            const res = await this.getPost(postId);
            const post: Post = res.Item as Post;

            return Response.success({ success: true, post });
        } catch (err) {
            console.error(err);
            return Response.error({ code: 'unknown-error', message: 'Unable to get post information', custom: true });
        }
    }

    private savePost = async (post: Post, user: UserBrief) => {
        const params = {
            TableName: 'INS-POSTS',
            Item: this.formatPostRecord(post, user)
        };

        await this.dynamo.put(params).promise();
        return params.Item;
    }

    private formatPostRecord = (post: Post, user: UserBrief) => {
        return {
            ...post,
            _id: uuidv4(),
            createdBy: user,
            comments: [],
            times: {
                createdAt: new Date().toISOString()
            }
        }
    }

    private updateAddUserPosts = (postId: string, userId: string) => {
        const params = {
            TableName: 'INS-USERS',
            Key: {
                _id: userId
            },
            UpdateExpression: 'SET posts = list_append(posts, :p)',
            ExpressionAttributeValues: {
                ':p': [ postId ]
            },
            ReturnValues: 'UPDATED_NEW'
        };

        return this.dynamo.update(params).promise();
    }

    private updateRemoveUserPosts = async (postId: string, userId: string) => {
        const posts = await UserUtils.getPostIds(userId);
        const postIndex = this.getPostIndex(posts, postId);
        if (postIndex < 0) return;

        const params = {
            TableName: 'INS-USERS',
            Key: {
                _id: userId
            },
            UpdateExpression: `REMOVE posts[${postIndex}]`,
            ReturnValues: 'UPDATED_NEW'
        };

        return this.dynamo.update(params).promise();
    }

    private getPostIndex = (posts: string[], postId: string) => posts.indexOf(postId);

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

    private getPublicPosts = async (limit: number, lastKey: string) => {
        const params = {
            TableName: 'INS-POSTS',
            Limit: limit,
            ExclusiveStartKey: lastKey ? { _id: lastKey } : undefined
        };

        return await UserUtils.dynamo.scan(params).promise();
    }

    private getPosts = async (postIds: string[]) => {
        const keysObj = {};
        let index = 0;
        postIds.forEach((id: string) => {
            index++;
            const titleKey = ':postIdVal' + index;
            keysObj[titleKey] = id;
        });

        const params = {
            TableName: 'INS-POSTS',
            FilterExpression: '#id IN (' + Object.keys(keysObj).toString() + ')',
            ExpressionAttributeNames: {
                '#id': '_id'
            },
            ExpressionAttributeValues: keysObj
        };

        return await UserUtils.dynamo.scan(params).promise();
    }

    private getPost = async (postId: string) => {
        const params = {
            TableName: 'INS-POSTS',
            Key: {
                _id: postId
            }
        };

        return await UserUtils.dynamo.get(params).promise();
    }

}
