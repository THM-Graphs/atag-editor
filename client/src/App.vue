<script setup lang="ts"></script>

<template>
	<nav>
		<RouterLink to="/">Go to Home | </RouterLink>
		<RouterLink to="/texts/1234">Go to Text 1234</RouterLink>
	</nav>
	<main>
		<RouterView />
	</main>
</template>

<style scoped></style>
