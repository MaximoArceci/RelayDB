import unittest

from app.cli import CliError, build_parser, create_connection, docs_urls, resolve_one


class FakeClient:
    def __init__(self) -> None:
        self.base_url = "http://api.test"
        self.posts = []

    def get(self, path: str):
        if path == "/api/v1/environments":
            return {
                "environments": [
                    {
                        "id": "env-1",
                        "name": "Main DB",
                        "project_id": "default",
                    }
                ]
            }
        raise AssertionError(path)

    def post(self, path: str, payload=None):
        self.posts.append((path, payload))
        return {"ok": True}


class CliTests(unittest.TestCase):
    def test_docs_command_reports_runtime_urls(self) -> None:
        parser = build_parser()
        args = parser.parse_args(["--api-url", "http://api.test", "docs", "--frontend-url", "http://ui.test"])

        result = docs_urls(FakeClient(), args)

        self.assertEqual(result["frontend"], "http://ui.test")
        self.assertEqual(result["openapi_docs"], "http://api.test/docs")

    def test_create_connection_resolves_target_and_uses_environment_project(self) -> None:
        parser = build_parser()
        args = parser.parse_args(["connections", "create", "max-local", "--owner", "max", "--port", "15432", "--target", "Main DB"])
        client = FakeClient()

        result = create_connection(client, args)

        self.assertEqual(result, {"ok": True})
        self.assertEqual(
            client.posts,
            [
                (
                    "/api/v1/connections",
                    {
                        "name": "max-local",
                        "owner": "max",
                        "stable_port": 15432,
                        "target_environment_id": "env-1",
                        "project_id": "default",
                    },
                )
            ],
        )

    def test_resolve_one_rejects_ambiguous_names(self) -> None:
        with self.assertRaises(CliError):
            resolve_one(
                [{"id": "a", "name": "Shared"}, {"id": "b", "name": "Shared"}],
                "Shared",
                "environment",
                ["id", "name"],
            )


if __name__ == "__main__":
    unittest.main()
