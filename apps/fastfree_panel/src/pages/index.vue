<template>
  <MachinesScreen />
</template>

<script setup lang="ts">
// `/` is an alias for `/machines`, which is the canonical route in PLAN.md.
// Filename-based routing is enabled, so there is no routes file to redirect in —
// the same screen component is mounted for both paths instead.
import MachinesScreen from '../components/MachinesScreen.vue';
</script>