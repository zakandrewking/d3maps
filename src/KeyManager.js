import Mousetrap from 'mousetrap'
import _ from 'underscore'

/**
 * If ctrl_equals_cmd is true and key has ctrl+ in it, return an array with
 * ctrl+ and meta+ variations.
 */
function _add_cmd (key, ctrl_equals_cmd) {
  if (!ctrl_equals_cmd) return key
  const key_ar = _.isArray(key) ? key : [key]
  const new_ar = key_ar.reduce((c, k) => {
    var n = k.replace('ctrl+', 'meta+')
    if (n !== k) c.push(n)
    return c
  }, key_ar.slice())
  return new_ar.length === key_ar.length ? key : new_ar
}

/**
 * KeyManager - Manage key listeners and events.
 * @param assignedKeys (default: {}): An object defining keys to bind.
 * @param input_list (default: []): A list of inputs that will override keyboard shortcuts when in focus.
 * @param selection (default: global): A node to bind the events to.
 * @param ctrl_equals_cmd (default: false): If true, then control and command have the same effect.
 */
export default class KeyManager {
  constructor (assignedKeys, input_list, selection, ctrl_equals_cmd) {
    // default Arguments
    this.assignedKeys = assignedKeys || {}
    this.input_list = input_list || []
    this.mousetrap = selection ? new Mousetrap(selection) : new Mousetrap()
    this.ctrl_equals_cmd = (!_.isBoolean(ctrl_equals_cmd)) ? false : ctrl_equals_cmd

    // Fix mousetrap behavior; by default, it ignore shortcuts when inputs are
    // in focus.
    // TODO NOT WORKING https://craig.is/killing/mice
    // consider swithching to https://github.com/PolicyStat/combokeys
    this.mousetrap.stopCallback = () => false

    this.enabled = true
    this.update()
  }

  /**
   * Updated key bindings if attributes have changed.
   */
  update () {
    this.mousetrap.reset()
    if (!this.enabled) return

    // loop through keys
    for (var key_id in this.assignedKeys) {
      var assigned_key = this.assignedKeys[key_id]

      // OK if this is missing
      if (!assigned_key.key) continue

      var key_to_bind = _add_cmd(assigned_key.key, this.ctrl_equals_cmd)
      // remember the input_list
      assigned_key.input_list = this.input_list
      this.mousetrap.bind(key_to_bind, function (e) {
        // check inputs
        let input_blocking = false
        if (this.ignore_with_input) {
          for (var i = 0, l = this.input_list.length; i < l; i++) {
            const thisInputVal = this.input_list[i]
            const thisInput = _.isFunction(thisInputVal)
                  ? thisInputVal()
                  : thisInputVal
            if (thisInput !== null && thisInput.is_visible()) {
              input_blocking = true
              break
            }
          }
        }

        if (!input_blocking) {
          if (this.fn) this.fn.call(this.target)
          else console.warn('No function for key: ' + this.key)
          e.preventDefault()
        }
      }.bind(assigned_key), 'keydown')
    }
  }


  toggle (on_off) {
    /** Turn the key manager on or off.

     */
    if (_.isUndefined(on_off)) on_off = !this.enabled
    this.enabled = on_off
    this.update()
  }


  add_enter_listener(callback, one_time) {
    /** Call the callback when the enter key is pressed, then
        unregisters the listener.

    */
    return this.add_key_listener('enter', callback, one_time)
  }


  add_escape_listener(callback, one_time) {
    /** Call the callback when the escape key is pressed, then
        unregisters the listener.

    */
    return this.add_key_listener('escape', callback, one_time)
  }

  /**
   * Call the callback when the key is pressed, then unregisters the listener.
   * Returns a function that will unbind the event.
   * @param callback: The callback function with no arguments.
   * @param key_name: A key name, or list of key names, as defined by the mousetrap library: https://craig.is/killing/mice
   * @param one_time: If True, then cancel the listener after the first execution.
   */
  add_key_listener (key_name, callback, one_time) {
    if (_.isUndefined(one_time)) one_time = false

    // unbind function ready to go
    var unbind = this.mousetrap.unbind.bind(this.mousetrap, key_name)

    this.mousetrap.bind(_add_cmd(key_name, this.ctrl_equals_cmd), function(e) {
      e.preventDefault()
      callback()
      if (one_time) unbind()
    })

    return unbind
  }
}
