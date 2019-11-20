import { baseManifest } from '@folio/stripes-acq-components';

import { INSTANCE_TYPES_API } from '../constants';

// eslint-disable-next-line import/prefer-default-export
export const INSTANCE_TYPES = {
  ...baseManifest,
  path: INSTANCE_TYPES_API,
  records: 'instanceTypes',
};
