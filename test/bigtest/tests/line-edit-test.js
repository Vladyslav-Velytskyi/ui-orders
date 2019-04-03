import {
  beforeEach,
  describe,
  it,
} from '@bigtest/mocha';
import { expect } from 'chai';

import { PHYSICAL } from '../../../src/components/POLine/const';
import {
  ORDERS_API,
} from '../../../src/components/Utils/api';
import calculateEstimatedPrice from '../../../src/components/POLine/calculateEstimatedPrice';
import setupApplication from '../helpers/setup-application';
import LineEditPage from '../interactors/line-edit-page';

const requiredField = 'Required!';
const validationYearMessage = 'Field should be 4-digit year';
const LIST_UNIT_PRICE = 1.1;
const QUANTITY_PHYSICAL = 2;
const cost = {
  listUnitPrice: LIST_UNIT_PRICE,
  quantityPhysical: QUANTITY_PHYSICAL,
};
const LINE_ESTIMATED_PRICE = calculateEstimatedPrice({ cost });

describe('Line edit test', () => {
  setupApplication();
  let order = null;
  let line = null;
  let location = null;
  let locations = null;
  const lineEditPage = new LineEditPage();

  beforeEach(async function () {
    order = await this.server.create('order');
    location = await this.server.create('location');
    line = await this.server.create('line', {
      order,
      orderFormat: PHYSICAL,
      cost,
    });

    locations = [
      {
        locationId: location.attrs.id,
        quantityPhysical: QUANTITY_PHYSICAL,
        quantityElectronic: 0,
      },
    ];

    this.server.get(`${ORDERS_API}/${order.id}`, {
      ...order.attrs,
      compositePoLines: [
        {
          ...line.attrs,
          locations,
        },
      ],
    });

    this.visit(`/orders/view/${order.id}/po-line/view/${line.id}?layer=edit-po-line`);
  });

  it('displays Line Edit form', () => {
    expect(lineEditPage.$root).to.exist;
    expect(lineEditPage.locationAccordion.$root).to.exist;
    expect(lineEditPage.fundDistributionAccordion.$root).to.exist;
    expect(lineEditPage.updateLineButton.isButton).to.be.true;
    expect(lineEditPage.publicationDateField.isInput).to.be.true;
  });

  describe('Location can be added', () => {
    beforeEach(async function () {
      await lineEditPage.locationAccordion.clickHeader();
      await lineEditPage.locationAccordion.clickAddLocationButton();
    });

    it('Location is added', () => {
      expect(lineEditPage.locationAccordion.locations().length).to.be.equal(locations.length + 1);
    });
  });

  describe('Check required fields and fields with incorrect inputs', () => {
    beforeEach(async function () {
      await lineEditPage.publicationDateField.fill('111');
      await lineEditPage.updateLineButton.click();
    });

    it('displays required and error messages', () => {
      expect(lineEditPage.validationMessage).to.include(requiredField, validationYearMessage);
    });
  });

  describe('Enter valid publication date', () => {
    beforeEach(async function () {
      await lineEditPage.publicationDateField.fill('2019');
      await lineEditPage.updateLineButton.click();
    });

    it('displays only required validation message', () => {
      expect(lineEditPage.validationMessage).to.include(requiredField);
    });
  });

  it('displays Cost form', () => {
    expect(lineEditPage.listUnitPrice.isInput).to.be.true;
    expect(lineEditPage.quantityPhysical.isInput).to.be.true;
    expect(lineEditPage.additionalCost.isInput).to.be.true;
    expect(lineEditPage.listUnitPriceElectronic.isInput).to.be.true;
    expect(lineEditPage.discount.isInput).to.be.true;
    expect(lineEditPage.quantityElectronic.isInput).to.be.true;
    expect(lineEditPage.poLineEstimatedPrice.$root).to.exist;
  });

  it('displays right estimated price in Cost form', () => {
    expect(lineEditPage.poLineEstimatedPrice.value).to.include(LINE_ESTIMATED_PRICE);
  });

  describe('listUnitPrice can be changed', () => {
    const NEW_PRICE = '3.33';

    beforeEach(async function () {
      await lineEditPage.listUnitPrice.fill(NEW_PRICE);
    });

    it('listUnitPrice contains new value', () => {
      expect(lineEditPage.listUnitPrice.value).to.be.equal(NEW_PRICE);
    });
  });

  describe('discount can be changed', () => {
    const NEW_DISCOUNT = '13';

    beforeEach(async function () {
      await lineEditPage.discount.fill(NEW_DISCOUNT);
    });

    it('discount contains new value', () => {
      expect(lineEditPage.discount.value).to.be.equal(NEW_DISCOUNT);
    });
  });

  describe('Fund can be added', () => {
    beforeEach(async function () {
      await lineEditPage.fundDistributionAccordion.clickHeader();
      await lineEditPage.fundDistributionAccordion.clickAddFundButton();
    });

    it('Fund is added', () => {
      expect(lineEditPage.fundDistributionAccordion.funds().length).to.be.equal(1);
    });
  });

  describe('Check not negative locations quantity validation', () => {
    const NEGATIVE_QUANTITY = -1;

    beforeEach(async function () {
      await lineEditPage.locationAccordion.physicalQuantity.fill(NEGATIVE_QUANTITY);
      await lineEditPage.locationAccordion.electronicQuantity.fill(NEGATIVE_QUANTITY);
      await lineEditPage.updateLineButton.click();
    });

    it('Should provide warning messages', () => {
      expect(lineEditPage.locationAccordion.warningMessage).to.be.equal('Quantity can not be less than 0');
    });
  });

  describe('Render expected PO Line form title', () => {
    describe('Create PO Line', () => {
      beforeEach(function () {
        return this.visit(`/orders/view/${order.id}/?layer=create-po-line`, () => {
          return expect(lineEditPage.$root).to.exist;
        });
      });

      it('Has to render expected title', () => {
        expect(lineEditPage.title).to.be.equal('Add PO Line');
      });
    });

    describe('Edit PO Line', () => {
      beforeEach(async function () {
        this.server.get(`${ORDERS_API}/${order.id}`, {
          ...order.attrs,
          compositePoLines: [line.attrs],
        });

        return this.visit(`/orders/view/${order.id}/po-line/view/${line.id}?layer=edit-po-line`, () => {
          return expect(lineEditPage.$root).to.exist;
        });
      });

      it('Has to render expected title', () => {
        expect(lineEditPage.title).to.be.equal(`Edit - ${line.poLineNumber}`);
      });
    });
  });
});
