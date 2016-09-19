/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * View mixin to handle an in-content back button.
 *
 * @class BackMixin
 */

define(function (require, exports, module) {
  'use strict';

  var BaseView = require('views/base');
  var KeyCodes = require('lib/key-codes');

  var BackMixin = {
    _canGoBack: false,
    initialize: function (options) {
      options = options || {};

      this._canGoBack = options.canGoBack;
    },

    events: {
      'click #back': 'back',
      'keyup #back': BaseView.preventDefaultThen('backOnEnter')
    },

    updateContext: function (context) {
      if (! context.has('canGoBack')) {
        context.set('canGoBack', this.canGoBack());
      }
    },

    /**
     * Go back to the last page.
     *
     * @method back
     * @param {object} [nextViewData] - data to send to the next(last) view.
     */
    back: function (nextViewData) {
      this.logViewEvent('back');

      this.notifier.trigger('navigate-back', {
        nextViewData: nextViewData
      });
    },

    /**
     * Go back to the last page, if the user pressed the enter key.
     *
     * @method backOnEnter
     * @param {Object} event
     */
    backOnEnter: function (event) {
      if (event.which === KeyCodes.ENTER) {
        this.back();
      }
    },

    /**
     * Check if the back button should be shown.
     *
     * @method canGoBack
     * @returns {Boolean}
     */
    canGoBack: function () {
      return !! this._canGoBack;
    }
  };

  module.exports = BackMixin;
});
