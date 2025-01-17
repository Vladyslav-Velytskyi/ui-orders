export const MODULE_ORDERS = 'ORDERS';
export const MODULE_TENANT = 'TENANT';
export const CONFIG_CLOSING_REASONS = 'closing-reasons';
export const CONFIG_CREATE_INVENTORY = 'createInventory';
export const CONFIG_LINES_LIMIT = 'poLines-limit';
export const CONFIG_ORDER_NUMBER = 'orderNumber';
export const CONFIG_ADDRESSES = 'tenant.addresses';
export const CONFIG_PREFIXES = 'prefix';
export const CONFIG_SUFFIXES = 'suffix';
export const CONFIG_ORDER_TEMPLATES = 'order-templates';
export const CONFIG_APPROVALS = 'approvals';
export const CONFIG_OPEN_ORDER = 'openOrder';
export const LINES_LIMIT_DEFAULT = 1;
export const LIMIT_MAX = 2147483647; // from https://s3.amazonaws.com/foliodocs/api/mod-orders-storage/location.html#orders_storage_locations_get
export const EMPTY_OPTION = {
  label: '',
  value: '',
};
