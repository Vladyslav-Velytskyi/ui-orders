import React, { Component } from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';

import { get } from 'lodash';

import {
  IfPermission,
  stripesShape,
} from '@folio/stripes/core';
import { withTags } from '@folio/stripes/smart-components';
import {
  Accordion,
  AccordionSet,
  Button,
  Callout,
  ConfirmationModal,
  ExpandAllButton,
  Icon,
  IconButton,
  MenuSection,
  Pane,
  PaneMenu,
  Row,
} from '@folio/stripes/components';
import { getConfigSetting } from '@folio/stripes-acq-components';

import {
  getAddresses,
} from '../../common/utils';
import { isOngoing } from '../../common/POFields';
import { LayerPO } from '../LayerCollection';
import {
  LINES_LIMIT,
  ORDER,
} from '../Utils/resources';
import {
  cloneOrder,
  updateOrderResource,
} from '../Utils/orderResource';
import { showUpdateOrderError } from '../Utils/order';
import { LINES_LIMIT_DEFAULT } from '../Utils/const';
import CloseOrderModal from './CloseOrder';
import OpenOrderConfirmationModal from './OpenOrderConfirmationModal';
import { WORKFLOW_STATUS } from '../../common/constants';
import LineListing from './LineListing';
import { PODetailsView } from './PODetails';
import { SummaryView } from './Summary';
import { RenewalsView } from './renewals';
import LinesLimit from './LinesLimit';
import POInvoicesContainer from './POInvoices';
import {
  isOpenAvailableForOrder,
  isReceiveAvailableForOrder,
} from './util';
import { UpdateOrderErrorModal } from './UpdateOrderErrorModal';

import css from './PO.css';

class PO extends Component {
  static manifest = Object.freeze({
    order: ORDER,
    linesLimit: LINES_LIMIT,
  });

  static propTypes = {
    connectedSource: PropTypes.object.isRequired,
    mutator: PropTypes.shape({
      order: PropTypes.shape({
        PUT: PropTypes.func.isRequired,
      }),
    }).isRequired,
    location: ReactRouterPropTypes.location.isRequired,
    history: ReactRouterPropTypes.history.isRequired,
    match: ReactRouterPropTypes.match.isRequired,
    stripes: stripesShape.isRequired,
    showToast: PropTypes.func.isRequired,
    onCloseEdit: PropTypes.func,
    onClose: PropTypes.func,
    onEdit: PropTypes.func,
    onCancel: PropTypes.func,
    parentResources: PropTypes.object.isRequired,
    parentMutator: PropTypes.object.isRequired,
    editLink: PropTypes.string,
    paneWidth: PropTypes.string.isRequired,
    resources: PropTypes.object.isRequired,
    tagsToggle: PropTypes.func.isRequired,
    tagsEnabled: PropTypes.bool,
  };

  static defaultProps = {
    tagsEnabled: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      sections: {
        purchaseOrder: true,
        POSummary: true,
        POListing: true,
        renewals: true,
        relatedInvoices: true,
      },
      isCloseOrderModalOpened: false,
      isLinesLimitExceededModalOpened: false,
      updateOrderError: null,
      showConfirmDelete: false,
    };
    this.transitionToParams = values => this.props.parentMutator.query.update(values);
    this.hasError = false;
    this.callout = React.createRef();
  }

  deletePO = () => {
    const { parentMutator, showToast } = this.props;
    const order = this.getOrder();
    const orderNumber = order.poNumber;

    parentMutator.records.DELETE(order).then(() => {
      showToast('ui-orders.order.delete.success', 'success', { orderNumber });
      parentMutator.query.update({
        _path: '/orders',
        layer: null,
      });
    });
  }

  actionMenu = ({ onToggle }) => (
    <MenuSection id="order-details-actions">
      <IfPermission perm="orders.item.delete">
        <Button
          buttonStyle="dropdownItem"
          data-test-button-delete-order
          onClick={() => {
            onToggle();
            this.mountDeleteOrderConfirm();
          }}
        >
          <Icon size="small" icon="trash">
            <FormattedMessage id="ui-orders.button.delete" />
          </Icon>
        </Button>
      </IfPermission>
      <IfPermission perm="orders.item.put">
        <Button
          buttonStyle="dropdownItem"
          data-test-button-edit-order
          onClick={() => {
            onToggle();
            this.props.onEdit();
          }}
        >
          <Icon size="small" icon="edit">
            <FormattedMessage id="ui-orders.button.edit" />
          </Icon>
        </Button>
      </IfPermission>
    </MenuSection>
  );

  onToggleSection = ({ id }) => {
    this.setState(({ sections }) => {
      const isSectionOpened = sections[id];

      return {
        sections: {
          ...sections,
          [id]: !isSectionOpened,
        },
      };
    });
  };

  handleExpandAll = (sections) => {
    this.setState({ sections });
  };

  openReceiveItem = (e) => {
    if (e) e.preventDefault();
    this.transitionToParams({ layer: 'receive-items' });
  };

  openReceived = (e) => {
    if (e) e.preventDefault();
    this.transitionToParams({ layer: 'received' });
  };

  onAddPOLine = () => {
    const { resources } = this.props;
    const linesLimit = Number(get(resources, ['linesLimit', 'records', '0', 'value'], LINES_LIMIT_DEFAULT));
    const poLines = get(resources, ['order', 'records', '0', 'compositePoLines'], []);

    if (linesLimit <= poLines.length) {
      this.setState({ isLinesLimitExceededModalOpened: true });
    } else {
      this.transitionToParams({ layer: 'create-po-line' });
    }
  };

  closeOrder = (reason, note) => {
    const { mutator, resources } = this.props;
    const order = get(resources, ['order', 'records', 0]);
    const closeOrderProps = {
      workflowStatus: WORKFLOW_STATUS.closed,
      closeReason: {
        reason,
        note,
      },
    };

    updateOrderResource(order, mutator.order, closeOrderProps);
    this.unmountCloseOrderModal();
  };

  approveOrder = () => {
    const { showToast, mutator } = this.props;
    const order = this.getOrder();
    const orderNumber = get(order, 'poNumber', '');

    updateOrderResource(order, mutator.order, { approved: true })
      .then(() => {
        showToast('ui-orders.order.approved.success', 'success', { orderNumber });
      })
      .catch(e => {
        return showUpdateOrderError(e, this.callout, this.orderErrorModalShow);
      });
  };

  openOrder = async () => {
    const { mutator, resources } = this.props;
    const order = get(resources, ['order', 'records', 0]);
    const openOrderProps = {
      workflowStatus: WORKFLOW_STATUS.open,
    };

    try {
      await updateOrderResource(order, mutator.order, openOrderProps);
    } catch (e) {
      await showUpdateOrderError(e, this.callout, this.orderErrorModalShow);
    } finally {
      this.toggleOpenOrderModal();
    }
  };

  createNewOrder = async () => {
    const { resources, parentMutator } = this.props;
    const order = get(resources, ['order', 'records', '0'], {});

    try {
      const newOrder = await cloneOrder(order, parentMutator.records);

      parentMutator.query.update({
        _path: `/orders/view/${newOrder.id}`,
        layer: null,
      });
      this.transitionToParams({ layer: 'create-po-line' });
    } catch (e) {
      this.callout.current.sendCallout({
        message: <FormattedMessage id="ui-orders.errors.noCreatedOrder" />,
        type: 'error',
      });
    } finally {
      this.unmountLinesLimitExceededModal();
    }
  };

  addPOLineButton = (isAbleToAddLines) => (
    <IfPermission perm="orders.po-lines.item.post">
      <Button
        data-test-add-line-button
        disabled={!isAbleToAddLines}
        onClick={this.onAddPOLine}
      >
        <FormattedMessage id="ui-orders.button.addLine" />
      </Button>
    </IfPermission>
  );

  toggleOpenOrderModal = () => {
    this.setState(prevState => ({ isOpenOrderModalOpened: !prevState.isOpenOrderModalOpened }));
  };

  mountCloseOrderModal = () => {
    this.setState({ isCloseOrderModalOpened: true });
  };

  unmountCloseOrderModal = () => {
    this.setState({ isCloseOrderModalOpened: false });
  };

  mountLinesLimitExceededModal = () => {
    this.setState({ isLinesLimitExceededModalOpened: true });
  };

  unmountLinesLimitExceededModal = () => {
    this.setState({ isLinesLimitExceededModalOpened: false });
  };

  closeErrorModal = () => {
    this.setState({ updateOrderError: null });
  };

  orderErrorModalShow = (errors) => {
    this.setState(() => ({ updateOrderError: errors }));
  };

  goToReceiving = () => {
    const { match: { params: { id } }, parentMutator: { query } } = this.props;
    const order = this.getOrder();

    query.replace({
      _path: `/orders/view/${id}/${order.workflowStatus === WORKFLOW_STATUS.open ? 'receiving' : 'receiving-history'}`,
    });
  };

  getOrder = () => get(this.props.resources, ['order', 'records', 0]);

  mountDeleteOrderConfirm = () => this.setState({ showConfirmDelete: true });

  unmountDeleteOrderConfirm = () => this.setState({ showConfirmDelete: false });

  render() {
    const {
      connectedSource,
      editLink,
      history,
      location,
      match,
      onClose,
      onCloseEdit,
      onEdit,
      parentMutator,
      parentResources,
      stripes,
      resources,
      showToast,
      tagsEnabled,
      tagsToggle,
    } = this.props;
    const order = this.getOrder();
    const { isApprovalRequired } = getConfigSetting(get(parentResources, 'approvalsSetting.records', {}));
    const isApproved = get(order, 'approved');
    const closingReasons = get(parentResources, 'closingReasons.records', []);
    const orderNumber = get(order, 'poNumber', '');
    const poLines = get(order, 'compositePoLines', []);
    const workflowStatus = get(order, 'workflowStatus');
    const isCloseOrderButtonVisible = workflowStatus === WORKFLOW_STATUS.open;
    const isOpenOrderButtonVisible = isOpenAvailableForOrder(isApprovalRequired, order);
    const isApproveOrderButtonVisible = isApprovalRequired && !isApproved;
    const isReceiveButtonVisible = isReceiveAvailableForOrder(order);
    const isAbleToAddLines = workflowStatus === WORKFLOW_STATUS.pending;
    const hasError = get(resources, ['order', 'failed']);
    const tags = get(order, 'tags.tagList', []);

    const lastMenu = (
      <PaneMenu>
        <IfPermission perm="orders.item.put">
          <FormattedMessage id="ui-orders.paneMenu.editOrder">
            {ariaLabel => (
              <IconButton
                ariaLabel={ariaLabel}
                data-test-order-edit
                icon="edit"
                style={{ visibility: !order ? 'hidden' : 'visible' }}
                onClick={onEdit}
                href={editLink}
              />
            )}
          </FormattedMessage>
        </IfPermission>
        {tagsEnabled && (
          <FormattedMessage id="ui-orders.showTags">
            {(title) => (
              <IconButton
                ariaLabel={title}
                badgeCount={tags.length}
                data-test-order-tags-action
                icon="tag"
                id="clickable-show-tags"
                onClick={tagsToggle}
                title={title}
              />
            )}
          </FormattedMessage>
        )}
      </PaneMenu>
    );

    if (hasError && !this.hasError) {
      showToast('ui-orders.errors.orderNotLoaded', 'error');
    }

    this.hasError = hasError;

    if (!order || hasError) {
      return (
        <Pane
          defaultWidth="fill"
          dismissible
          id="pane-podetails"
          lastMenu={lastMenu}
          onClose={onClose}
          paneTitle={<FormattedMessage id="ui-orders.order.paneTitle.detailsLoading" />}
        >
          <Icon icon="spinner-ellipsis" width="100px" />
        </Pane>
      );
    }

    const vendors = get(parentResources, 'vendors.records', []);
    const vendor = vendors.find(d => d.id === order.vendor);
    const assignedTo = get(parentResources, 'users.records', []).find(d => d.id === order.assignedTo);
    const createdByUserId = get(order, 'metadata.createdByUserId');
    const createdBy = get(parentResources, 'users.records', []).find(d => d.id === createdByUserId);

    const orderType = get(order, 'orderType');
    const addresses = getAddresses(get(parentResources, 'addresses.records', []));
    const funds = get(parentResources, 'fund.records', []);

    order.vendorName = get(vendor, 'name');
    order.assignedToUser = assignedTo && assignedTo.personal
      ? `${assignedTo.personal.firstName} ${assignedTo.personal.lastName}`
      : '';
    order.createdByName = createdBy && createdBy.personal
      ? `${createdBy.personal.firstName} ${createdBy.personal.lastName}`
      : '';

    const { updateOrderError } = this.state;

    return (
      <Pane
        actionMenu={this.actionMenu}
        data-test-order-details
        defaultWidth="fill"
        paneTitle={<FormattedMessage id="ui-orders.order.paneTitle.details" values={{ orderNumber }} />}
        lastMenu={lastMenu}
        dismissible
        onClose={onClose}
      >
        <Row end="xs">
          <IfPermission perm="orders.receiving.collection.post">
            {isReceiveButtonVisible && (
              <div className={css.buttonWrapper}>
                <Button
                  buttonStyle="primary"
                  className={css.button}
                  data-test-receiving-button
                  onClick={this.goToReceiving}
                >
                  <FormattedMessage id="ui-orders.paneBlock.receiveBtn" />
                </Button>
              </div>
            )}
          </IfPermission>

          <IfPermission perm="orders.item.put">
            <IfPermission perm="orders.item.approve">
              {isApproveOrderButtonVisible && (
                <div className={css.buttonWrapper}>
                  <Button
                    buttonStyle="default"
                    className={css.button}
                    data-test-approve-order-button
                    onClick={this.approveOrder}
                  >
                    <FormattedMessage id="ui-orders.paneBlock.approveBtn" />
                  </Button>
                </div>
              )}
            </IfPermission>
            {isCloseOrderButtonVisible && (
              <div className={css.buttonWrapper}>
                <Button
                  buttonStyle="primary"
                  className={css.button}
                  data-test-close-order-button
                  onClick={this.mountCloseOrderModal}
                >
                  <FormattedMessage id="ui-orders.paneBlock.closeBtn" />
                </Button>
              </div>
            )}
            {isOpenOrderButtonVisible && (
              <div className={css.buttonWrapper}>
                <Button
                  buttonStyle="primary"
                  className={css.button}
                  data-test-open-order-button
                  onClick={this.toggleOpenOrderModal}
                >
                  <FormattedMessage id="ui-orders.paneBlock.openBtn" />
                </Button>
              </div>
            )}
            {this.state.isCloseOrderModalOpened && (
              <CloseOrderModal
                cancel={this.unmountCloseOrderModal}
                closeOrder={this.closeOrder}
                closingReasons={closingReasons}
                orderNumber={orderNumber}
              />
            )}
            {this.state.isOpenOrderModalOpened && (
              <OpenOrderConfirmationModal
                orderNumber={orderNumber}
                submit={this.openOrder}
                cancel={this.toggleOpenOrderModal}
              />
            )}
          </IfPermission>

          <div>
            <ExpandAllButton
              accordionStatus={this.state.sections}
              onToggle={this.handleExpandAll}
            />
          </div>
        </Row>
        <AccordionSet accordionStatus={this.state.sections} onToggle={this.onToggleSection}>
          <Accordion
            id="purchaseOrder"
            label={<FormattedMessage id="ui-orders.paneBlock.purchaseOrder" />}
          >
            <PODetailsView
              addresses={addresses}
              order={order}
            />
          </Accordion>
          {isOngoing(orderType) && (
            <Accordion
              id="renewals"
              label={<FormattedMessage id="ui-orders.paneBlock.renewals" />}
            >
              <RenewalsView order={order} />
            </Accordion>
          )}
          <Accordion
            id="POSummary"
            label={<FormattedMessage id="ui-orders.paneBlock.POSummary" />}
          >
            <SummaryView order={order} {...this.props} />
          </Accordion>
          <POInvoicesContainer
            label={<FormattedMessage id="ui-orders.paneBlock.relatedInvoices" />}
            orderId={order.id}
            vendors={vendors}
          />
          <Accordion
            displayWhenOpen={this.addPOLineButton(isAbleToAddLines)}
            id="POListing"
            label={<FormattedMessage id="ui-orders.paneBlock.POLines" />}
          >
            <LineListing
              baseUrl={match.url}
              funds={funds}
              poLines={poLines}
              queryMutator={parentMutator.query}
            />
          </Accordion>
        </AccordionSet>
        <LayerPO
          connectedSource={connectedSource}
          order={order}
          location={location}
          stripes={stripes}
          onCancel={onCloseEdit}
          history={history}
          match={match}
          parentResources={parentResources}
          parentMutator={parentMutator}
        />
        {this.state.isLinesLimitExceededModalOpened && (
          <LinesLimit
            cancel={this.unmountLinesLimitExceededModal}
            createOrder={this.createNewOrder}
          />
        )}
        {updateOrderError && (
          <UpdateOrderErrorModal
            orderNumber={orderNumber}
            errors={updateOrderError}
            cancel={this.closeErrorModal}
          />
        )}
        {this.state.showConfirmDelete && (
          <ConfirmationModal
            id="delete-order-confirmation"
            confirmLabel={<FormattedMessage id="ui-orders.order.delete.confirmLabel" />}
            heading={<FormattedMessage id="ui-orders.order.delete.heading" values={{ orderNumber }} />}
            message={<FormattedMessage id="ui-orders.order.delete.message" />}
            onCancel={this.unmountDeleteOrderConfirm}
            onConfirm={this.deletePO}
            open
          />
        )}
        <Callout ref={this.callout} />
      </Pane>
    );
  }
}

export default withTags(PO);
