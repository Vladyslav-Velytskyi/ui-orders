import {
  collection,
  fillable,
  interactor,
  isVisible,
} from '@bigtest/interactor';

import Button from './button';
import { FILTERS } from '../../../src/OrderLinesList/constants';

@interactor class FilterAccordion {
  isExpanded = isVisible('[class*=content---]');
}

@interactor class OrderLinesFilterInteractor {
  static defaultScope = '#pane-filter';

  accordionCreatedDate = new FilterAccordion(`#${FILTERS.DATE_CREATED}`);
  accordionPaymentStatus = new FilterAccordion(`#${FILTERS.PAYMENT_STATUS}`);
  accordionReceiptStatus = new FilterAccordion(`#${FILTERS.RECEIPT_STATUS}`);

  fillCreatedDateStart = fillable('input[name="startDate"]');
  fillCreatedDateEnd = fillable('input[name="endDate"]');
  applyCreatedDate = new Button('[data-test-apply-button]');
}

@interactor class OrdersNavigation {
  static defaultScope = '[data-test-orders-navigation]';
}

export default interactor(class OrderLinesInteractor {
  static defaultScope = '[data-test-order-line-instances]';

  instances = collection('[role=row] a');

  navigation = new OrdersNavigation();

  filter = new OrderLinesFilterInteractor();
});
