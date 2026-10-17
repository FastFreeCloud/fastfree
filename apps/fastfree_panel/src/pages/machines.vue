<template>
  <MachinesScreen />
</template>

<script setup lang="ts">
// The design plan (PLAN.md) makes `/machines` the canonical route for this
// screen; `/` renders the same screen so the app has no dead entry URL.
import MachinesScreen from '../components/MachinesScreen.vue';
</script>