import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { Field } from 'redux-form';

import stripesForm from '@folio/stripes/form';
import {
  Col,
  Modal,
  ModalFooter,
  Row,
  Select,
  TextArea,
} from '@folio/stripes/components';

const CloseOrderModalForm = ({ close, open, orderId }) => {
  const cancelBtn = <FormattedMessage id="ui-orders.closeOrderModal.cancel" />;
  const submitBtn = <FormattedMessage id="ui-orders.closeOrderModal.submit" />;
  const footer = (
    <ModalFooter
      secondaryButton={{
        label: cancelBtn,
        onClick: close,
      }}
      primaryButton={{
        label: submitBtn,
        onClick: close,
      }}
    />
  );

  return (
    <Modal
      footer={footer}
      label={<FormattedMessage id="ui-orders.closeOrderModal.title" values={{ orderId }} />}
      open={open}
    >
      <Row>
        <Col xs={12}>
          <Field
            component={Select}
            label={<FormattedMessage id="ui-orders.closeOrderModal.reason" />}
            name="reason"
          />
          <Field
            component={TextArea}
            label={<FormattedMessage id="ui-orders.closeOrderModal.notes" />}
            name="notes"
          />
        </Col>
      </Row>
    </Modal>
  );
};

CloseOrderModalForm.propTypes = {
  close: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  orderId: PropTypes.string.isRequired,
};

export default stripesForm({
  form: 'closeOrderModalForm',
  navigationCheck: true,
  enableReinitialize: true,
})(CloseOrderModalForm);
