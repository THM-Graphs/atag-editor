<script setup lang="ts">
defineProps({
	uuid: String,
});
</script>

<template>
	<div>This is a page containing editable texts</div>
	<div>UUID of current letter: {{ uuid }}</div>
</template>

<style scoped></style>
