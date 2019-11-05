import { LocationsController } from './locations.controller';

const controller: LocationsController = new LocationsController();

export const getPostsByLocationHandler = controller.getPosts;
