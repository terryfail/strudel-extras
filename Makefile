args = `arg="$(filter-out $@,$(MAKECMDGOALS))" && echo $${arg:-${1}}`

run:
	pnpm i; node server.js $(call args)

%:
    @: