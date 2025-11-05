const React = require('react');

class ReactWidget extends React.Component {
  constructor(props) {
    super(props);
    this.title = { label: '', closable: false };
    this.id = '';
    // no-op update to satisfy Theia widgets
    this.update = () => {};
  }

  render() {
    return null;
  }
}

module.exports = { ReactWidget };
