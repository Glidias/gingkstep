import Vue from 'vue';

export const HOTKEY_STEP_BINDINGS = [17, 32, 37]; // ctrl (left), spacebar(middle), left arrow key (right)

var maskState = 0;
var heldMaskState = 0;

export const COMMANDS = [0, 0, 0, 0, 0, 0, 0, 0];
COMMANDS[1] = 'prevStep';
COMMANDS[4] = 'nextStep';
COMMANDS[2|4] = 'nextSong';
COMMANDS[1|2] = 'prevSong';
COMMANDS[1|2|4] = 'cancel';
COMMANDS[2] = 'select';

export const BUS = new Vue();

function handleChordKeys(state) {
  if (COMMANDS[state]) {
    // do something
    BUS.$emit('hotkeyTriggered', COMMANDS[state]);
  }
}

export const mixin = {
  methods: {
    onKeydownHotBox(e) {
      e.preventDefault();
      let index = HOTKEY_STEP_BINDINGS.indexOf(e.keyCode);
      if (index >=0) {
        maskState |= (1 << index);
        heldMaskState |= (1 << index);
      }
    },
    onKeyupHotBox(e) {
      e.preventDefault();
      let index = HOTKEY_STEP_BINDINGS.indexOf(e.keyCode);
      if (index >=0) {
        maskState &= ~(1 << index);

        if (maskState === 0) {
          handleChordKeys(heldMaskState);
          heldMaskState = 0;
        }
      }
    },
    onTapDummy(e) {
      e.stopPropagation();
    }
  }
}