import React, { Component } from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import {
  Field,
  getFormValues,
} from 'redux-form';
import { get } from 'lodash';

import {
  Col,
  InfoPopover,
  KeyValue,
  Row,
  TextField,
} from '@folio/stripes/components';
import FieldCurrency from './FieldCurrency';
import { requiredPositiveNumber } from '../../Utils/Validate';
import {
  ERESOURCES,
  PHRESOURCES,
  OTHER,
} from '../const';

const disabled = true;

const parseNumber = (value) => {
  return value && value.length > 0 ? Number(value) : value;
};

class CostForm extends Component {
  static propTypes = {
    initialValues: PropTypes.object,
    stripes: PropTypes.shape({
      store: PropTypes.object,
    }),
    dispatch: PropTypes.func,
    change: PropTypes.func,
  }

  constructor(props) {
    super(props);
    this.onChangeInput = this.onChangeInput.bind(this);
    this.calculateEstimatedPrice = this.calculateEstimatedPrice.bind(this);
  }

  onChangeInput(e, propertyName) {
    const { dispatch, change } = this.props;

    dispatch(change(propertyName, e));
  }

  calculateEstimatedPrice() {
    const { stripes: { store } } = this.props;
    const formValues = getFormValues('POLineForm')(store.getState());
    const listPrice = parseFloat(get(formValues, 'cost.listPrice', 0)) || 0;
    const quantityPhysical = parseInt(get(formValues, 'cost.quantityPhysical', 0), 10) || 0;
    const quantityElectronic = parseInt(get(formValues, 'cost.quantityElectronic', 0), 10) || 0;
    const estimatedPrice = parseFloat(listPrice * (quantityPhysical + quantityElectronic)).toFixed(2);

    return estimatedPrice;
  }

  render() {
    const { stripes: { store } } = this.props;
    const formValues = getFormValues('POLineForm')(store.getState());
    const orderFormat = formValues.orderFormat;
    const validateEresources = ERESOURCES.includes(orderFormat)
      ? { validate: requiredPositiveNumber }
      : { disabled };
    const validatePhresources = PHRESOURCES.includes(orderFormat) || orderFormat === OTHER
      ? { validate: requiredPositiveNumber }
      : { disabled };

    return (
      <Row>
        <Col xs={6}>
          <Field
            component={TextField}
            fullWidth
            label={<FormattedMessage id="ui-orders.cost.listPrice" />}
            name="cost.listPrice"
            onChange={e => this.onChangeInput(e.target.value, 'cost.listPrice')}
            required
            type="number"
            validate={requiredPositiveNumber}
          />
        </Col>
        <Col xs={6}>
          <FieldCurrency />
        </Col>
        <Col xs={6}>
          <Field
            component={TextField}
            fullWidth
            label={<FormattedMessage id="ui-orders.cost.quantityPhysical" />}
            name="cost.quantityPhysical"
            type="number"
            parse={parseNumber}
            {...validatePhresources}
          />
        </Col>
        <Col xs={6}>
          <Field
            component={TextField}
            fullWidth
            label={<FormattedMessage id="ui-orders.cost.quantityElectronic" />}
            name="cost.quantityElectronic"
            type="number"
            parse={parseNumber}
            {...validateEresources}
          />
        </Col>
        <Col xs={6}>
          <KeyValue
            label={
              <div>
                <span>
                  <FormattedMessage id="ui-orders.cost.estimatedPrice" />
                </span>
                <InfoPopover
                  buttonLabel={<FormattedMessage id="ui-orders.cost.buttonLabel" />}
                  content={<FormattedMessage id="ui-orders.cost.info" />}
                />
              </div>
            }
            value={this.calculateEstimatedPrice()}
          />
        </Col>
      </Row>
    );
  }
}

export default CostForm;
