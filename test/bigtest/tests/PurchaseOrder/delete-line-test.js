import { beforeEach, describe, it } from '@bigtest/mocha';
import { expect } from 'chai';

import { ORDERS_API } from '../../../../src/components/Utils/api';
import { PHYSICAL } from '../../../../src/components/POLine/const';
import setupApplication from '../../helpers/setup-application';
import LineDetailsPage from '../../interactors/line-details-page';
import ConfirmationModal from '../../interactors/confirmation';

describe('Delete Order Line', function () {
  setupApplication();

  const page = new LineDetailsPage();
  let order = null;
  let line = null;

  beforeEach(function () {
    order = this.server.create('order');
    line = this.server.create('line', {
      purchaseOrderId: order.id,
      order,
      orderFormat: PHYSICAL,
      cost: {
        quantityPhysical: 2,
      },
    });

    this.server.get(`${ORDERS_API}/${order.id}`, {
      ...order.attrs,
      compositePoLines: [line.attrs],
    });

    this.visit(`/orders/view/${order.id}/po-line/view/${line.id}`);
  });

  it('shows Line Details Pane', () => {
    expect(page.isVisible).to.be.true;
  });

  it("doesn't show Line Details action menu", () => {
    expect(page.actions.isPresent).to.be.false;
  });

  describe('click on header', () => {
    beforeEach(async function () {
      await page.actions.toggle.click();
    });

    it('shows action menu', () => {
      expect(page.actions.isPresent).to.be.true;
    });
  });

  describe('click delete line', () => {
    const deleteLineConfirmation = new ConfirmationModal('#delete-line-confirmation');

    beforeEach(async function () {
      await page.actions.toggle.click();
      await page.actions.delete.click();
    });

    it('shows delete line confirmation', () => {
      expect(deleteLineConfirmation.isVisible).to.be.true;
    });
  });

  describe('click delete line and cancel', () => {
    const deleteLineConfirmation = new ConfirmationModal('#delete-line-confirmation');

    beforeEach(async function () {
      await page.actions.toggle.click();
      await page.actions.delete.click();
      await deleteLineConfirmation.cancel();
    });

    it('closes delete line confirmation', () => {
      expect(deleteLineConfirmation.isPresent).to.be.false;
    });

    it('shows Line Details Pane', () => {
      expect(page.isVisible).to.be.true;
    });
  });

  describe('click delete line and confirm', () => {
    const deleteLineConfirmation = new ConfirmationModal('#delete-line-confirmation');

    beforeEach(async function () {
      await page.actions.toggle.click();
      await page.actions.delete.click();
      await deleteLineConfirmation.confirm();
    });

    it('closes delete line confirmation', () => {
      expect(deleteLineConfirmation.isPresent).to.be.false;
    });

    it('closes Line Details Pane', () => {
      expect(page.isPresent).to.be.false;
    });
  });

  describe('click edit line button in caret menu', () => {
    beforeEach(async function () {
      await page.actions.toggle.click();
      await page.actions.edit.click();
    });

    it('closes Line Details Pane', () => {
      expect(page.isPresent).to.be.false;
    });
  });
});