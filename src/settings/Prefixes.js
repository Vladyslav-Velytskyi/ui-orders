import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { ConfigManager } from '@folio/stripes/smart-components';

import { MODULE_ORDERS } from '../components/Utils/const';
import { getSettingsList } from '../common/utils';
import PrefixesForm from './PrefixesForm';
import css from './Prefixes.css';

class Prefixes extends Component {
  static propTypes = {
    label: PropTypes.object.isRequired,
    stripes: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.configManager = props.stripes.connect(ConfigManager);
  }

  beforeSave = ({ selectedItems }) => (
    JSON.stringify({
      selectedItems: selectedItems.map(item => item.value),
    })
  );

  render() {
    const { label, stripes } = this.props;

    return (
      <div
        data-test-order-settings-prefixes
        className={css.formWrapper}
      >
        <this.configManager
          configName="prefixes"
          getInitialValues={getSettingsList}
          label={label}
          moduleName={MODULE_ORDERS}
          onBeforeSave={this.beforeSave}
        >
          <PrefixesForm stripes={stripes} />
        </this.configManager>
      </div>
    );
  }
}

export default Prefixes;