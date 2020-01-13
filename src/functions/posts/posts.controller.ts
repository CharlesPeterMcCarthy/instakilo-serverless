import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import Response from '../../responses/api.responses';
import { Post, UserBrief } from '@instakilo/common';
import uuidv4 from 'uuid/v4';
import Auth from '../../auth/verify';
import UserUtils from '../../user/user';
import { PostUpdateInfo } from './posts.interfaces';
import ErrorTypes from '../../responses/error.types';
import { HashTagsController } from "../hashtags/hashtags.controller";
import { LocationsController } from "../locations/locations.controller";

export class PostsController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();
    private hashTags: HashTagsController = new HashTagsController();
    private locations: LocationsController = new LocationsController();

    public create = async (event) => {
        console.log(event);
        const data = JSON.parse(event.body);
        const { post, token }: { post: Post, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed(ErrorTypes.AUTH_INVALID());

        try {
            const user: UserBrief = await UserUtils.getBriefDetails(auth.sub);
            if (!user) return Response.notFound(ErrorTypes.USER_NOT_FOUND());

            const savedPost = await this.savePost(post, user);
            await this.updateAddUserPosts(savedPost._id, post.imageURL, user._id);

            const { locationName, placeData } = post.location;
            await this.hashTags.sort([], savedPost.hashTags, { _id: savedPost._id, imgURL: savedPost.imageURL });
            await this.locations.add(placeData.place_id, locationName, placeData, { _id: savedPost._id, imgURL: savedPost.imageURL });

            return Response.success();
        } catch (err) {
            console.error(err);
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to create post'));
        }
    }

    public delete = async (event) => {
        const data = JSON.parse(event.body);
        const { postId, token }: { postId: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed(ErrorTypes.AUTH_INVALID());

        const user: UserBrief = await UserUtils.getBriefDetails(auth.sub);
        if (!user) return Response.notFound(ErrorTypes.USER_NOT_FOUND());

        try {
            const post: Post = (await this.getPost(postId)).Item as Post;
            await this.deletePost(postId, user._id);
            await this.updateRemoveUserPosts(postId, user._id);

            await this.hashTags.sort(post.hashTags, [], { _id: post._id, imgURL: post.imageURL });
            await this.locations.remove(post.location.placeData.place_id, { _id: post._id, imgURL: post.imageURL });

            return Response.success();
        } catch (err) {
            console.error(err);
            if (err.code === 'ConditionalCheckFailedException') return Response.error(ErrorTypes.UNAUTH_POST_DELETE());
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to delete post'));
        }
    }

    public update = async (event) => {
        const data = JSON.parse(event.body);
        const { postInfo, token }: { postInfo: PostUpdateInfo, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed(ErrorTypes.AUTH_INVALID());

        try {
            const oldPost: Post = (await this.getPost(postInfo.postId)).Item as Post;
            await this.updatePost(postInfo, auth.sub);
            const newPost: Post = (await this.getPost(postInfo.postId)).Item as Post;

            await this.hashTags.sort(oldPost.hashTags, newPost.hashTags, { _id: newPost._id, imgURL: newPost.imageURL });

            return Response.success();
        } catch (err) {
            console.error(err);
            if (err.code === 'ConditionalCheckFailedException') return Response.error(ErrorTypes.UNAUTH_POST_UPDATE());
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to update post'));
        }
    }

    public queryPublic = async (event) => {
        console.log(event);
        const data = JSON.parse(event.body);
        const { limit, lastKey, token }: { limit: number, lastKey: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed(ErrorTypes.AUTH_INVALID());

        try {
            const res = await this.getPublicPosts(limit, lastKey);
            const posts = res.Items;
            const newLastKey = res.LastEvaluatedKey && res.LastEvaluatedKey._id;
            const moreAvailable = !!res.LastEvaluatedKey;

            return Response.success({ posts, lastKey: newLastKey, moreAvailable });
        } catch (err) {
            console.error(err);
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to retrieve posts'));
        }
    }

    public queryOwn = async (event) => {
        const data = JSON.parse(event.body);
        const token: string = data.token;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed(ErrorTypes.AUTH_INVALID());

        try {
            const basicPosts: Array<{ _id: string; imageURL: string }> = await UserUtils.getPosts(auth.sub);
            const postIds = basicPosts.map(p => p._id);
            const res = await this.getPosts(postIds);
            const posts = res.Items;

            return Response.success({ posts });
        } catch (err) {
            console.error(err);
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to retrieve posts'));
        }
    }

    public querySingle = async (event) => {
        const data = JSON.parse(event.body);
        const { postId, token}: { postId: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed(ErrorTypes.AUTH_INVALID());

        try {
            const res = await this.getPost(postId);
            const post: Post = res.Item as Post;

            return Response.success({ post });
        } catch (err) {
            console.error(err);
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to get post information'));
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
            commentCount: 0,
            timestamp: new Date().getTime(),
            // timestamp2: new Date().getTime(),
            times: {
                createdAt: new Date().toISOString()
            }
        }
    }

    private updateAddUserPosts = (postId: string, imageURL: string, userId: string) => {
        const params = {
            TableName: 'INS-USERS',
            Key: {
                _id: userId
            },
            UpdateExpression: 'SET posts = list_append(posts, :p), #pc = #pc + :pc',
            ExpressionAttributeValues: {
                ':p': [
                    {
                        _id: postId,
                        imageURL
                    }
                ],
                ':pc': 1
            },
            ExpressionAttributeNames: {
                '#pc': 'postsCount'
            },
            ReturnValues: 'UPDATED_NEW'
        };

        return this.dynamo.update(params).promise();
    }

    private updateRemoveUserPosts = async (postId: string, userId: string) => {
        const posts = await UserUtils.getPosts(userId);
        const postIndex = this.getPostIndex(posts, postId);
        if (postIndex < 0) return;

        const params = {
            TableName: 'INS-USERS',
            Key: {
                _id: userId
            },
            UpdateExpression: `REMOVE posts[${postIndex}] SET #pc = #pc + :pc`,
            ExpressionAttributeValues: {
                ':pc': -1
            },
            ExpressionAttributeNames: {
                '#pc': 'postsCount'
            },
            ReturnValues: 'UPDATED_NEW'
        };

        return this.dynamo.update(params).promise();
    }

    private getPostIndex = (posts: Array<{ _id: string; imageURL: string }>, postId: string) => posts.map(p => p._id).indexOf(postId);

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
        console.log(limit)
        console.log(lastKey)
        const params = {
            TableName: 'INS-POSTS',
            // IndexName: "timestamp2-index",
            // KeyConditionExpression: "Email = :email",
            // ExpressionAttributeValues:{
            //     ":email": { "S" : email }
            // },
            //ScanIndexForward: false,
            Limit: limit,
            ExclusiveStartKey: lastKey ? { _id: lastKey } : undefined
        };

        return await this.dynamo.scan(params).promise();
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

        return await this.dynamo.scan(params).promise();
    }

    private getPost = async (postId: string) => {
        const params = {
            TableName: 'INS-POSTS',
            Key: {
                _id: postId
            }
        };

        return await this.dynamo.get(params).promise();
    }

}
