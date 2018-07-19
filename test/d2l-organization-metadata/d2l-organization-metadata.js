describe('d2l-organization-metadata', () => {
	var component,
		fetchStub,
		sandbox,
		organizationEntity,
		semesterOrganizationEntity;

	function SetupFetchStub(url, entity) {
		fetchStub.withArgs(sinon.match.has('url', sinon.match(url)))
			.returns(Promise.resolve({
				ok: true,
				json: () => { return Promise.resolve(entity); }
			}));
	}

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		organizationEntity = window.D2L.Hypermedia.Siren.Parse({
			class: ['active', 'course-offering'],
			properties: {
				name: 'Course name',
				code: 'COURSE100',
				startDate: '2050-01-01T00:00:00.000Z',
				endDate: null,
				isActive: true
			},
			links: [{
				rel: ['self'],
				href: '/organizations/1'
			}, {
				rel: ['https://notifications.api.brightspace.com/rels/organization-notifications'],
				href: '/organizations/1/my-notifications'
			}, {
				rel: ['https://api.brightspace.com/rels/parent-semester'],
				href: '/organizations/2'
			}]
		});
		semesterOrganizationEntity = window.D2L.Hypermedia.Siren.Parse({
			class: ['active', 'semester'],
			properties: {
				name: 'Test Semester',
				code: 'SEM169'
			},
			links: [{
				rel: ['self'],
				href: '/organizations/2'
			}, {
				rel: ['https://notifications.api.brightspace.com/rels/organization-notifications'],
				href: '/organizations/2/my-notifications'
			}]
		});

		fetchStub = sandbox.stub(window.d2lfetch, 'fetch');
		SetupFetchStub(/\/organizations\/1$/, organizationEntity);
		SetupFetchStub(/\/organizations\/2$/, semesterOrganizationEntity);
		SetupFetchStub(/\/organizations\/1\/my-notifications$/, { properties: {} });

		component = fixture('d2l-organization-metadata-fixture');
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('loads element', () => {
		expect(component).to.exist;
	});

	describe('Setting the href attribute', () => {
		it('should fetch the organization', done => {
			var spy = sandbox.spy(component, '_handleOrganizationResponse');

			component.href = '/organizations/1';

			setTimeout(function() {
				expect(spy).to.have.been.called;
				done();
			});
		});
	});

	describe('Updating the organization', () => {
		it('should update the course name', () => {
			var courseText = component.$$('.course-text');

			component._organization = null;
			expect(courseText.innerText.trim()).to.be.empty;

			component._organization = organizationEntity;
			expect(courseText.innerText).to.contain(organizationEntity.properties.name);
		});

		it('should update the course code', () => {
			var courseCodeText = component.$$('.course-code-text');

			component._organization = null;
			expect(courseCodeText.innerText.trim()).to.be.empty;

			component._organization = organizationEntity;
			expect(courseCodeText.innerText).to.contain(organizationEntity.properties.code);
		});

		it('should (eventually) update the semester name', done => {
			var spy = sandbox.spy(component, '_handleSemesterResponse');

			component._organization = organizationEntity;

			setTimeout(() => {
				expect(spy).to.have.been.called;
				var semesterText = component.$$('.semester-text');
				expect(semesterText.innerText).to.contain(semesterOrganizationEntity.properties.name);
				done();
			});
		});
	});

	describe('Course code', () => {
		it('should show the course code if configured true', () => {
			component.showCourseCode = true;
			var courseCode = component.$$('.course-code-text');

			Polymer.dom.flush();

			expect(courseCode.hasAttribute('hidden')).to.be.false;
		});

		it('should not show the course code if configured false', () => {
			component.showCourseCode = false;
			var courseCode = component.$$('.course-code-text');

			Polymer.dom.flush();

			expect(courseCode.hasAttribute('hidden')).to.be.true;
		});
	});

	describe('Semester name', () => {
		it('should show the semester if the showSemester is set', () => {
			component.showSemester = true;
			var semester = component.$$('.semester-text');

			Polymer.dom.flush();

			expect(semester.hasAttribute('hidden')).to.be.false;
		});

		it('should not set the semester name if the show semester config is false', () => {
			component.showSemester = false;
			var semester = component.$$('.semester-text');

			Polymer.dom.flush();

			expect(semester.hasAttribute('hidden')).to.be.true;
		});
	});

	describe('Separator between course code and semester name', () => {
		function testName(testCase) {
			return 'should ' + (testCase.showSeparator ? '' : ' not ')
				+ 'show the separator when '
				+ 'showCourseCode=' + testCase.showCourseCode + ', '
				+ 'showSemester=' + testCase.showSemester + ', '
				+ 'semesterName="' + testCase.semesterName + '", '
				+ 'courseCode="' + testCase.courseCode + '"';
		}

		[
			{ showCourseCode: false, showSemester: false, semesterName: '', courseCode: '', showSeparator: false },
			{ showCourseCode: false, showSemester: true, semesterName: '', courseCode: '', showSeparator: false },
			{ showCourseCode: false, showSemester: true, semesterName: 'foo', courseCode: '', showSeparator: false },
			{ showCourseCode: false, showSemester: true, semesterName: 'foo', courseCode: 'bar', showSeparator: false },
			{ showCourseCode: true, showSemester: false, semesterName: '', courseCode: '', showSeparator: false },
			{ showCourseCode: true, showSemester: false, semesterName: '', courseCode: 'bar', showSeparator: false },
			{ showCourseCode: true, showSemester: true, semesterName: '', courseCode: 'bar', showSeparator: false },
			{ showCourseCode: true, showSemester: true, semesterName: 'foo', courseCode: 'bar', showSeparator: true }
		].forEach(testCase => {
			it(testName(testCase), () => {
				component.showCourseCode = testCase.showCourseCode;
				component.showSemester = testCase.showSemester;
				component._organization = window.D2L.Hypermedia.Siren.Parse({
					properties: {
						code: testCase.courseCode
					}
				});
				component._semester = window.D2L.Hypermedia.Siren.Parse({
					properties: {
						name: testCase.semesterName
					}
				});

				Polymer.dom.flush();

				var separator = component.$$('.separator-icon');
				expect(separator.hasAttribute('hidden')).to.equal(!testCase.showSeparator);
			});
		});
	});

	describe('Course updates functionality', () => {
		function testName(testCase) {
			return 'should show ' +
				(testCase.updatesShown ? testCase.updateString : 'nothing') +
				' when updates=' + testCase.count;
		}

		[
			{ count: -1, updateString: '-1', updatesShown: false },
			{ count: 0, updateString: '0', updatesShown: false },
			{ count: 1, updateString: '1', updatesShown: true },
			{ count: 99, updateString: '99', updatesShown: true },
			{ count: 100, updateString: '99+', updatesShown: true },
		].forEach(testCase => {
			it(testName(testCase), done => {
				fetchStub.restore();
				fetchStub = sandbox.stub(window.d2lfetch, 'fetch');
				SetupFetchStub(/\/organizations\/1\/my-notifications$/, {
					properties: {
						UnattemptedQuizzes: testCase.count,
						UnreadAssignmentFeedback: 0,
						UngradedQuizzes: 0,
						UnreadDiscussions: 0,
						UnapprovedDiscussions: 0,
						UnreadAssignmentSubmissions: 0
					}
				});

				component.courseUpdatesConfig = {
					showUnattemptedQuizzes: true
				};

				component._organization = window.D2L.Hypermedia.Siren.Parse({
					links: [{
						rel: ['https://notifications.api.brightspace.com/rels/organization-notifications'],
						href: '/organizations/1/my-notifications'
					}]
				});

				setTimeout(() => {
					expect(component._showUpdateCount).to.equal(testCase.updatesShown);
					expect(component._updateCount).to.equal(testCase.count);
					var updateString = component.$$('.update-text-box').innerText;
					expect(updateString).to.equal(testCase.updateString);
					done();
				});
			});
		});
	});
});
